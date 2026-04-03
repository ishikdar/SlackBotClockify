import { WebClient } from '@slack/web-api';
import { Config } from '../types/index.js';

export class SlackService {
  private readonly client: WebClient;

  constructor(config: Config) {
    this.client = new WebClient(config.slack.botToken);
  }

  async getUserEmail(userId: string): Promise<string | null> {
    try {
      const result = await this.client.users.info({ user: userId });

      if (!result.ok || !result.user) {
        return null;
      }

      return result.user.profile?.email ?? null;
    } catch (error) {
      console.error(`Failed to get user email for ${userId}:`, error);
      return null;
    }
  }

  async postMessage(channel: string, text: string): Promise<void> {
    await this.client.chat.postMessage({
      channel,
      text,
    });
  }

  async postEphemeralMessage(
    channel: string,
    userId: string,
    text: string
  ): Promise<void> {
    await this.client.chat.postEphemeral({
      channel,
      user: userId,
      text,
    });
  }

  async addReaction(
    channel: string,
    timestamp: string,
    emoji: string
  ): Promise<void> {
    try {
      await this.client.reactions.add({
        channel,
        timestamp,
        name: emoji,
      });
    } catch (error) {
      // Ignore if reaction already exists
      console.error(`Failed to add reaction:`, error);
    }
  }

  async removeReaction(
    channel: string,
    timestamp: string,
    emoji: string
  ): Promise<void> {
    try {
      await this.client.reactions.remove({
        channel,
        timestamp,
        name: emoji,
      });
    } catch (error) {
      // Ignore if reaction doesn't exist
      console.error(`Failed to remove reaction:`, error);
    }
  }

  getClient(): WebClient {
    return this.client;
  }
}
