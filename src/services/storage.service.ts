import { DailyUpdateRecord } from '../types/index.js';

/**
 * In-memory storage for mapping Slack messages to Clockify time entries.
 * For production, consider using a database like SQLite, PostgreSQL, or Redis.
 */
export class StorageService {
  private records: Map<string, DailyUpdateRecord> = new Map();

  /**
   * Creates a unique key using the Clockify time entry ID
   */
  private createKey(clockifyTimeEntryId: string): string {
    return clockifyTimeEntryId;
  }

  async saveRecord(record: DailyUpdateRecord): Promise<void> {
    const key = this.createKey(record.clockifyTimeEntryId);
    this.records.set(key, {
      ...record,
      updatedAt: new Date(),
    });
  }

  async getRecordByClockifyId(clockifyTimeEntryId: string): Promise<DailyUpdateRecord | null> {
    return this.records.get(clockifyTimeEntryId) ?? null;
  }

  /**
   * Gets all records for a specific message (multiple projects/entries possible)
   */
  async getRecordsByMessageTs(
    messageTs: string,
    userId: string
  ): Promise<DailyUpdateRecord[]> {
    const records: DailyUpdateRecord[] = [];
    for (const record of this.records.values()) {
      if (record.slackMessageTs === messageTs && record.slackUserId === userId) {
        records.push(record);
      }
    }
    return records;
  }

  async deleteRecordByClockifyId(clockifyTimeEntryId: string): Promise<boolean> {
    return this.records.delete(clockifyTimeEntryId);
  }

  /**
   * Deletes all records for a specific message
   */
  async deleteRecordsByMessageTs(messageTs: string, userId: string): Promise<number> {
    let deleted = 0;
    const keysToDelete: string[] = [];
    
    for (const [key, record] of this.records.entries()) {
      if (record.slackMessageTs === messageTs && record.slackUserId === userId) {
        keysToDelete.push(key);
      }
    }
    
    for (const key of keysToDelete) {
      this.records.delete(key);
      deleted++;
    }
    
    return deleted;
  }

  async getAllRecords(): Promise<DailyUpdateRecord[]> {
    return Array.from(this.records.values());
  }

  /**
   * Checks if a user already has daily update entries for a specific date.
   * Returns true if any entry exists for that date.
   */
  async hasEntryForDate(
    userId: string,
    date: string
  ): Promise<boolean> {
    for (const record of this.records.values()) {
      if (record.slackUserId === userId && record.date === date) {
        return true;
      }
    }
    return false;
  }
}
