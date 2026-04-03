import { describe, it, expect } from 'vitest';
import {
  isDailyUpdateMessage,
  extractDailyUpdateContent,
  parseProjectEntries,
  getMatchedKeywords,
} from '../../src/utils/message-parser.js';

describe('message-parser', () => {
  describe('isDailyUpdateMessage', () => {
    it('should return true for messages with [project][duration] format', () => {
      expect(isDailyUpdateMessage('[project_1][6h]')).toBe(true);
    });

    it('should return true for messages with multiple projects', () => {
      expect(isDailyUpdateMessage('[project_1][6h] [project_2][2h]')).toBe(true);
    });

    it('should return true for decimal hours', () => {
      expect(isDailyUpdateMessage('[project_1][6.5h]')).toBe(true);
    });

    it('should return false for messages without project format', () => {
      expect(isDailyUpdateMessage('Hello everyone!')).toBe(false);
      expect(isDailyUpdateMessage('Daily update')).toBe(false);
      expect(isDailyUpdateMessage('[project_1]')).toBe(false); // Missing duration
    });
  });

  describe('parseProjectEntries', () => {
    it('should parse single project entry', () => {
      const entries = parseProjectEntries('[project_1][6h]');
      expect(entries).toHaveLength(1);
      expect(entries[0]).toEqual({ projectName: 'project_1', durationHours: 6, description: '' });
    });

    it('should parse multiple project entries', () => {
      const entries = parseProjectEntries('[project_1][6h] [project_2][2h]');
      expect(entries).toHaveLength(2);
      expect(entries[0]).toEqual({ projectName: 'project_1', durationHours: 6, description: '' });
      expect(entries[1]).toEqual({ projectName: 'project_2', durationHours: 2, description: '' });
    });

    it('should parse decimal hours', () => {
      const entries = parseProjectEntries('[project_1][6.5h]');
      expect(entries[0].durationHours).toBe(6.5);
    });

    it('should handle hours without h suffix', () => {
      const entries = parseProjectEntries('[project_1][6]');
      expect(entries[0].durationHours).toBe(6);
    });

    it('should be case-insensitive for project names', () => {
      const entries = parseProjectEntries('[PROJECT_1][6h]');
      expect(entries[0].projectName).toBe('project_1');
    });

    it('should return empty array for invalid format', () => {
      const entries = parseProjectEntries('Hello world');
      expect(entries).toHaveLength(0);
    });

    it('should extract per-project descriptions', () => {
      const input = `[project_1][6h]

approved batch qa4
raised pr
created new batch

[project_2][2h]

test
test 2`;
      const entries = parseProjectEntries(input);
      expect(entries).toHaveLength(2);
      expect(entries[0]?.projectName).toBe('project_1');
      expect(entries[0]?.durationHours).toBe(6);
      expect(entries[0]?.description).toContain('approved batch qa4');
      expect(entries[0]?.description).not.toContain('test 2');
      expect(entries[1]?.projectName).toBe('project_2');
      expect(entries[1]?.durationHours).toBe(2);
      expect(entries[1]?.description).toContain('test');
      expect(entries[1]?.description).not.toContain('approved batch');
    });

    it('should combine same project entries', () => {
      const input = `[project_1][6h]

approved batch qa4
raised pr

[project_1][2h]

test`;
      const entries = parseProjectEntries(input);
      expect(entries).toHaveLength(1);
      expect(entries[0]?.projectName).toBe('project_1');
      expect(entries[0]?.durationHours).toBe(8); // 6 + 2
      expect(entries[0]?.description).toContain('approved batch qa4');
      expect(entries[0]?.description).toContain('test');
    });
  });

  describe('extractDailyUpdateContent', () => {
    it('should remove project tags', () => {
      const input = '[project_1][6h] Working on feature X';
      expect(extractDailyUpdateContent(input)).toBe('Working on feature X');
    });

    it('should clean Slack user mentions', () => {
      const input = '[project_1][6h] Hey <@U12345678>';
      expect(extractDailyUpdateContent(input)).toBe('Hey');
    });

    it('should preserve newlines', () => {
      const input = '[project_1][6h]\n• Task 1\n• Task 2';
      expect(extractDailyUpdateContent(input)).toBe('• Task 1\n• Task 2');
    });
  });

  describe('getMatchedKeywords', () => {
    it('should return project:hours format', () => {
      const keywords = getMatchedKeywords('[project_1][6h] [project_2][2h]');
      expect(keywords).toContain('project_1:6h');
      expect(keywords).toContain('project_2:2h');
    });

    it('should return empty array for no matches', () => {
      const keywords = getMatchedKeywords('Just a regular message');
      expect(keywords).toHaveLength(0);
    });
  });
});
