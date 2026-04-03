import 'dotenv/config';
import { App, LogLevel } from '@slack/bolt';
import { loadConfig } from './config/index.js';
import { ClockifyService, SlackService, StorageService } from './services/index.js';
import { MessageEventHandler } from './events/index.js';

async function main(): Promise<void> {
  // Load configuration
  const config = loadConfig();

  // Initialize services
  const clockifyService = new ClockifyService(config);
  const storageService = new StorageService();

  // Initialize Slack Bolt app
  const app = new App({
    token: config.slack.botToken,
    signingSecret: config.slack.signingSecret,
    socketMode: true,
    appToken: config.slack.appToken,
    logLevel: LogLevel.INFO,
  });

  // Initialize Slack service (for helper methods)
  const slackService = new SlackService(config);

  // Initialize event handler
  const messageHandler = new MessageEventHandler(
    config,
    clockifyService,
    slackService,
    storageService
  );

  // Handle new messages
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  app.message(async ({ event, logger }: any) => {
    try {
      // Type guard for regular messages
      if (!('subtype' in event) || event.subtype === undefined) {
        await messageHandler.handleNewMessage(event as any);
      }
    } catch (error) {
      logger.error('Error handling message:', error);
    }
  });

  // Handle message_changed events (edits)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  app.event('message', async ({ event, logger }: any) => {
    try {
      const messageEvent = event as any;

      if (messageEvent.subtype === 'message_changed') {
        await messageHandler.handleMessageChanged(messageEvent);
      } else if (messageEvent.subtype === 'message_deleted') {
        await messageHandler.handleMessageDeleted(messageEvent);
      }
    } catch (error) {
      logger.error('Error handling message event:', error);
    }
  });

  // Start the app
  await app.start(config.port);
  console.log(`⚡️ Slack Bot is running on port ${config.port}`);
  console.log(`📋 Monitoring channel: ${config.slack.channelId}`);
  console.log(`🕐 Timezone: ${config.timezone}`);
  console.log(`📍 Format: [project_name][hours] (e.g., [project_1][6h] [project_2][2h])`);
  console.log(`📂 Projects: ${Object.keys(config.clockify.projects).join(', ')}`);
}

main().catch((error) => {
  console.error('Fatal error starting app:', error);
  process.exit(1);
});
