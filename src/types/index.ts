export interface ClockifyTimeEntry {
  id: string;
  description: string;
  projectId: string;
  workspaceId: string;
  userId: string;
  timeInterval: {
    start: string;
    end: string;
    duration: string;
  };
}

export interface ClockifyCreateTimeEntry {
  start: string;
  end: string;
  description: string;
  projectId: string;
  billable?: boolean;
}

export interface ClockifyUser {
  id: string;
  email: string;
  name: string;
}

export interface ClockifyProject {
  id: string;
  name: string;
  workspaceId: string;
}

export interface SlackMessageEvent {
  type: string;
  subtype?: string;
  channel: string;
  user: string;
  text: string;
  ts: string;
  team: string;
  event_ts: string;
  channel_type: string;
}

export interface SlackMessageChangedEvent {
  type: string;
  subtype: 'message_changed';
  channel: string;
  ts: string;
  message: {
    type: string;
    user: string;
    text: string;
    ts: string;
    edited?: {
      user: string;
      ts: string;
    };
  };
  previous_message: {
    type: string;
    user: string;
    text: string;
    ts: string;
  };
  event_ts: string;
}

export interface SlackMessageDeletedEvent {
  type: string;
  subtype: 'message_deleted';
  channel: string;
  ts: string;
  deleted_ts: string;
  event_ts: string;
}

export interface DailyUpdateRecord {
  slackMessageTs: string;
  slackUserId: string;
  clockifyTimeEntryId: string;
  projectId: string;
  projectName: string;
  description: string;
  durationHours: number;
  date: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Parsed project entry from message.
 * Format: [project_name][duration] followed by description
 */
export interface ParsedProjectEntry {
  projectName: string;
  durationHours: number;
  description: string;
}

export interface Config {
  slack: {
    botToken: string;
    signingSecret: string;
    appToken: string;
    channelId: string;
  };
  clockify: {
    apiKey: string;
    workspaceId: string;
    projects: Record<string, string>; // project_name -> project_id mapping
  };
  timezone: string;
  port: number;
}

export type ProjectType = 'project_1' | 'project_2';
