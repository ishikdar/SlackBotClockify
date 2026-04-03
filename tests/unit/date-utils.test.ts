import { describe, it, expect } from 'vitest';
import {
  isWorkingDay,
  formatDateString,
} from '../../src/utils/date-utils.js';

describe('date-utils', () => {
  describe('isWorkingDay', () => {
    it('should return true for Monday', () => {
      const monday = new Date(2026, 3, 6); // April 6, 2026 is Monday
      expect(isWorkingDay(monday)).toBe(true);
    });

    it('should return true for Friday', () => {
      const friday = new Date(2026, 3, 3); // April 3, 2026 is Friday
      expect(isWorkingDay(friday)).toBe(true);
    });

    it('should return false for Saturday', () => {
      const saturday = new Date(2026, 3, 4); // April 4, 2026 is Saturday
      expect(isWorkingDay(saturday)).toBe(false);
    });

    it('should return false for Sunday', () => {
      const sunday = new Date(2026, 3, 5); // April 5, 2026 is Sunday
      expect(isWorkingDay(sunday)).toBe(false);
    });
  });

  describe('formatDateString', () => {
    it('should format date as YYYY-MM-DD', () => {
      const date = new Date(2026, 3, 2); // April 2, 2026
      expect(formatDateString(date)).toBe('2026-04-02');
    });

    it('should pad single digit months and days', () => {
      const date = new Date(2026, 0, 5); // January 5, 2026
      expect(formatDateString(date)).toBe('2026-01-05');
    });
  });
});
