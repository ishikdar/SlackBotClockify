import { Config } from '../types/index.js';

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

/**
 * Parses project mappings from environment variables.
 * Format: CLOCKIFY_PROJECTS=project_1:id1,project_2:id2
 */
function parseProjects(): Record<string, string> {
  const projectsEnv = process.env.CLOCKIFY_PROJECTS;
  if (!projectsEnv) {
    throw new Error('Missing required environment variable: CLOCKIFY_PROJECTS');
  }

  const projects: Record<string, string> = {};
  const pairs = projectsEnv.split(',');

  for (const pair of pairs) {
    const [name, id] = pair.split(':').map((s) => s.trim());
    if (name && id) {
      projects[name.toLowerCase()] = id;
    }
  }

  if (Object.keys(projects).length === 0) {
    throw new Error('CLOCKIFY_PROJECTS must contain at least one project mapping (format: name:id,name:id)');
  }

  return projects;
}

export function loadConfig(): Config {
  return {
    slack: {
      botToken: requireEnv('SLACK_BOT_TOKEN'),
      signingSecret: requireEnv('SLACK_SIGNING_SECRET'),
      appToken: requireEnv('SLACK_APP_TOKEN'),
      channelId: requireEnv('SLACK_CHANNEL_ID'),
    },
    clockify: {
      apiKey: requireEnv('CLOCKIFY_API_KEY'),
      workspaceId: requireEnv('CLOCKIFY_WORKSPACE_ID'),
      projects: parseProjects(),
    },
    timezone: process.env.TIMEZONE ?? 'Asia/Dhaka',
    port: parseInt(process.env.PORT ?? '3000', 10),
  };
}

export const WORK_DURATION_HOURS = 8;
