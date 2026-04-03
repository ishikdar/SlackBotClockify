import { ClockifyService } from '../services/clockify.service.js';
import { SlackService } from '../services/slack.service.js';
import { StorageService } from '../services/storage.service.js';
import {
    Config,
    SlackMessageEvent,
    SlackMessageChangedEvent,
    SlackMessageDeletedEvent,
    DailyUpdateRecord,
} from '../types/index.js';
import {
    isDailyUpdateMessage,
    parseProjectEntries,
} from '../utils/message-parser.js';
import {
    getCurrentDateInTimezone,
    formatDateString,
    isWorkingDay,
} from '../utils/date-utils.js';

export class MessageEventHandler {
    constructor(
        private readonly config: Config,
        private readonly clockifyService: ClockifyService,
        private readonly slackService: SlackService,
        private readonly storageService: StorageService
    ) { }

    /**
     * Handles new message events from Slack.
     */
    async handleNewMessage(event: SlackMessageEvent): Promise<void> {
        // Ignore non-target channels
        if (event.channel !== this.config.slack.channelId) {
            return;
        }

        // Ignore bot messages and messages with subtypes
        if (event.subtype) {
            return;
        }

        // Check if this is a daily update message (contains [project][duration] pattern)
        if (!isDailyUpdateMessage(event.text)) {
            return;
        }

        // Parse project entries from message
        const projectEntries = parseProjectEntries(event.text);
        if (projectEntries.length === 0) {
            return;
        }

        const currentDate = getCurrentDateInTimezone(this.config.timezone);

        // Only process on working days
        if (!isWorkingDay(currentDate)) {
            console.log(`Skipping message ${event.ts}: Not a working day`);
            return;
        }

        // Check if user already has entries for today
        const todayDateStr = formatDateString(currentDate);
        const hasExisting = await this.storageService.hasEntryForDate(event.user, todayDateStr);
        if (hasExisting) {
            console.log(`User ${event.user} already has entry for ${todayDateStr}, skipping`);
            return;
        }

        try {
            // Get user email from Slack
            const userEmail = await this.slackService.getUserEmail(event.user);
            if (!userEmail) {
                console.error(`Could not get email for Slack user ${event.user}`);
                return;
            }

            // Find Clockify user by email
            const clockifyUser = await this.clockifyService.getUserByEmail(userEmail);
            if (!clockifyUser) {
                console.error(`Could not find Clockify user with email ${userEmail}`);
                return;
            }

            // Validate all projects exist before creating any entries
            const invalidProjects: string[] = [];
            for (const entry of projectEntries) {
                const projectId = this.clockifyService.getProjectIdByName(entry.projectName);
                if (!projectId) {
                    invalidProjects.push(entry.projectName);
                }
            }

            if (invalidProjects.length > 0) {
                console.error(`Unknown project(s): ${invalidProjects.join(', ')}`);
                return;
            }

            // Create time entries for each project
            const createdEntries: { projectName: string; hours: number }[] = [];
            let startHour = 9; // Start at 9 AM

            for (const entry of projectEntries) {
                const projectId = this.clockifyService.getProjectIdByName(entry.projectName);
                if (!projectId) continue;

                // Create time entry dates based on duration
                const startDate = new Date(currentDate);
                startDate.setHours(startHour, 0, 0, 0);
                
                const endDate = new Date(startDate);
                endDate.setHours(startDate.getHours() + entry.durationHours);

                // Create Clockify time entry
                const timeEntry = await this.clockifyService.createTimeEntry(
                    clockifyUser.id,
                    {
                        start: startDate.toISOString(),
                        end: endDate.toISOString(),
                        description: entry.description,
                        projectId,
                    }
                );

                // Store the mapping
                const record: DailyUpdateRecord = {
                    slackMessageTs: event.ts,
                    slackUserId: event.user,
                    clockifyTimeEntryId: timeEntry.id,
                    projectId,
                    projectName: entry.projectName,
                    description: entry.description,
                    durationHours: entry.durationHours,
                    date: todayDateStr,
                    createdAt: new Date(),
                    updatedAt: new Date(),
                };
                await this.storageService.saveRecord(record);

                createdEntries.push({ projectName: entry.projectName, hours: entry.durationHours });
                startHour += entry.durationHours; // Next entry starts after this one
            }

            // Add success reaction
            await this.slackService.addReaction(event.channel, event.ts, 'white_check_mark');

            console.log(
                `Created ${createdEntries.length} Clockify entries for user ${userEmail}`
            );
        } catch (error) {
            console.error('Error creating Clockify entries:', error);
        }
    }

    /**
     * Handles message edit events from Slack.
     */
    async handleMessageChanged(event: SlackMessageChangedEvent): Promise<void> {
        // Ignore non-target channels
        if (event.channel !== this.config.slack.channelId) {
            return;
        }

        const messageTs = event.message.ts;
        const userId = event.message.user;
        const newText = event.message.text;

        // Get existing records for this message
        const existingRecords = await this.storageService.getRecordsByMessageTs(messageTs, userId);

        if (existingRecords.length === 0 || !existingRecords[0]) {
            // Message wasn't a daily update before, check if it is now
            if (isDailyUpdateMessage(newText)) {
                await this.handleNewMessage({
                    type: 'message',
                    channel: event.channel,
                    user: userId,
                    text: newText,
                    ts: messageTs,
                    team: '',
                    event_ts: event.event_ts,
                    channel_type: 'channel',
                });
            }
            return;
        }

        // Check if the edited message still has project entries
        if (!isDailyUpdateMessage(newText)) {
            // Message no longer has project entries - delete all Clockify entries
            await this.handleMessageDeleted({
                type: 'message',
                subtype: 'message_deleted',
                channel: event.channel,
                ts: event.ts,
                deleted_ts: messageTs,
                event_ts: event.event_ts,
            });
            return;
        }

        try {
            const userEmail = await this.slackService.getUserEmail(userId);
            if (!userEmail) {
                console.error(`Could not get email for Slack user ${userId}`);
                return;
            }

            const clockifyUser = await this.clockifyService.getUserByEmail(userEmail);
            if (!clockifyUser) {
                console.error(`Could not find Clockify user with email ${userEmail}`);
                return;
            }

            // Parse new project entries
            const newEntries = parseProjectEntries(newText);
            const firstRecord = existingRecords[0];
            if (!firstRecord) return;
            const currentDate = new Date(firstRecord.date);

            // Delete all existing entries first
            for (const record of existingRecords) {
                try {
                    await this.clockifyService.deleteTimeEntry(record.clockifyTimeEntryId);
                    await this.storageService.deleteRecordByClockifyId(record.clockifyTimeEntryId);
                } catch (error) {
                    console.error(`Error deleting entry ${record.clockifyTimeEntryId}:`, error);
                }
            }

            // Create new entries
            let startHour = 9;
            const createdEntries: { projectName: string; hours: number }[] = [];

            for (const entry of newEntries) {
                const projectId = this.clockifyService.getProjectIdByName(entry.projectName);
                if (!projectId) {
                    console.log(`Unknown project: ${entry.projectName}`);
                    continue;
                }

                const startDate = new Date(currentDate);
                startDate.setHours(startHour, 0, 0, 0);
                
                const endDate = new Date(startDate);
                endDate.setHours(startDate.getHours() + entry.durationHours);

                const timeEntry = await this.clockifyService.createTimeEntry(
                    clockifyUser.id,
                    {
                        start: startDate.toISOString(),
                        end: endDate.toISOString(),
                        description: entry.description,
                        projectId,
                    }
                );

                const record: DailyUpdateRecord = {
                    slackMessageTs: messageTs,
                    slackUserId: userId,
                    clockifyTimeEntryId: timeEntry.id,
                    projectId,
                    projectName: entry.projectName,
                    description: entry.description,
                    durationHours: entry.durationHours,
                    date: formatDateString(currentDate),
                    createdAt: new Date(),
                    updatedAt: new Date(),
                };
                await this.storageService.saveRecord(record);

                createdEntries.push({ projectName: entry.projectName, hours: entry.durationHours });
                startHour += entry.durationHours;
            }

            // Update reaction
            await this.slackService.removeReaction(event.channel, messageTs, 'pencil');
            await this.slackService.addReaction(event.channel, messageTs, 'pencil');

            console.log(`Updated ${createdEntries.length} Clockify entries for message ${messageTs}`);
        } catch (error) {
            console.error('Error updating Clockify entries:', error);
        }
    }

    /**
     * Handles message delete events from Slack.
     */
    async handleMessageDeleted(event: SlackMessageDeletedEvent): Promise<void> {
        // Ignore non-target channels
        if (event.channel !== this.config.slack.channelId) {
            return;
        }

        // Find all records for this message
        const allRecords = await this.storageService.getAllRecords();
        const recordsToDelete = allRecords.filter((r) => r.slackMessageTs === event.deleted_ts);

        if (recordsToDelete.length === 0) {
            console.log(`No Clockify entries found for deleted message ${event.deleted_ts}`);
            return;
        }

        for (const record of recordsToDelete) {
            try {
                // Delete Clockify time entry
                await this.clockifyService.deleteTimeEntry(record.clockifyTimeEntryId);

                // Remove local record
                await this.storageService.deleteRecordByClockifyId(record.clockifyTimeEntryId);

                console.log(
                    `Deleted Clockify entry ${record.clockifyTimeEntryId} (${record.projectName})`
                );
            } catch (error) {
                console.error(`Error deleting Clockify entry ${record.clockifyTimeEntryId}:`, error);
            }
        }
    }
}
