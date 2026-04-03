import { ParsedProjectEntry } from '../types/index.js';

/**
 * Pattern to match [project_name][duration]
 * Examples: [project_1][6h], [project_2][2h], [mimir][8h]
 */
const PROJECT_ENTRY_PATTERN = /\[([^\]]+)\]\[(\d+(?:\.\d+)?)\s*h?\]/gi;

/**
 * Checks if a message contains any project entries.
 * Format: [project_name][duration]
 */
export function isDailyUpdateMessage(text: string): boolean {
  PROJECT_ENTRY_PATTERN.lastIndex = 0; // Reset regex state
  return PROJECT_ENTRY_PATTERN.test(text);
}

/**
 * Cleans Slack formatting from text.
 */
function cleanSlackFormatting(text: string): string {
  return text
    .replace(/<@[A-Z0-9]+>/g, '') // Remove user mentions
    .replace(/<#[A-Z0-9]+\|[^>]+>/g, '') // Remove channel mentions
    .replace(/<https?:\/\/[^|>]+\|([^>]+)>/g, '$1') // Clean links with labels
    .replace(/<https?:\/\/[^>]+>/g, '') // Remove plain links
    .replace(/[^\S\n]+/g, ' ') // Normalize spaces but preserve newlines
    .replace(/\n{3,}/g, '\n\n') // Limit consecutive newlines to 2
    .trim();
}

/**
 * Parses project entries from a message with their associated descriptions.
 * Format: [project_name][duration] followed by description text until next tag or end.
 * Returns array of { projectName, durationHours, description }
 * Multiple entries for the same project are combined (hours summed, descriptions merged).
 */
export function parseProjectEntries(text: string): ParsedProjectEntry[] {
  const rawEntries: ParsedProjectEntry[] = [];
  const pattern = /\[([^\]]+)\]\[(\d+(?:\.\d+)?)\s*h?\]/gi;
  
  // Find all matches with their positions
  const matches: { projectName: string; durationHours: number; endIndex: number }[] = [];
  let match;
  
  while ((match = pattern.exec(text)) !== null) {
    const projectNameMatch = match[1];
    const durationMatch = match[2];
    
    if (!projectNameMatch || !durationMatch) continue;
    
    const projectName = projectNameMatch.trim().toLowerCase();
    const durationHours = parseFloat(durationMatch);
    
    if (projectName && durationHours > 0) {
      matches.push({
        projectName,
        durationHours,
        endIndex: match.index + match[0].length,
      });
    }
  }
  
  // Extract descriptions between tags
  for (let i = 0; i < matches.length; i++) {
    const current = matches[i];
    if (!current) continue;
    
    const descriptionStart = current.endIndex;
    
    // Find next tag position
    const remaining = text.substring(descriptionStart);
    const nextTagMatch = remaining.search(/\[([^\]]+)\]\[(\d+(?:\.\d+)?)\s*h?\]/i);
    
    const rawDescription = nextTagMatch >= 0
      ? remaining.substring(0, nextTagMatch)
      : remaining;
    
    rawEntries.push({
      projectName: current.projectName,
      durationHours: current.durationHours,
      description: cleanSlackFormatting(rawDescription),
    });
  }
  
  // Combine entries with the same project name
  const projectMap = new Map<string, ParsedProjectEntry>();
  
  for (const entry of rawEntries) {
    const existing = projectMap.get(entry.projectName);
    if (existing) {
      // Sum hours and combine descriptions
      existing.durationHours += entry.durationHours;
      if (entry.description) {
        existing.description = existing.description
          ? `${existing.description}\n\n${entry.description}`
          : entry.description;
      }
    } else {
      projectMap.set(entry.projectName, { ...entry });
    }
  }
  
  return Array.from(projectMap.values());
}

/**
 * Extracts the daily update content from a message.
 * Removes project tags and cleans Slack formatting.
 */
export function extractDailyUpdateContent(text: string): string {
  let cleanedText = text.replace(/\[([^\]]+)\]\[(\d+(?:\.\d+)?)\s*h?\]/gi, '');
  return cleanSlackFormatting(cleanedText);
}

/**
 * Gets matched project entries for logging purposes.
 */
export function getMatchedKeywords(text: string): string[] {
  const entries = parseProjectEntries(text);
  return entries.map((e) => `${e.projectName}:${e.durationHours}h`);
}
