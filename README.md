# Slack Bot Clockify

Automatically create Clockify time entries from Slack daily update messages.

## Features

- � **Multiple Projects**: Support multiple projects per message with custom durations
- ✏️ **Edit Sync**: Message edits automatically update Clockify entries
- 🗑️ **Delete Sync**: Deleted messages remove corresponding Clockify entries
- 🕐 **Timezone aware**: Uses Asia/Dhaka timezone
- 📅 **One update per day**: Only first message creates entries; edit to modify

## Quick Start

```bash
# Install dependencies
npm install

# Copy and configure environment
cp .env.example .env
# Edit .env with your credentials

# Run in development
npm run dev

# Or build and run production
npm run build
npm start
```

## Setup

See [docs/SETUP.md](docs/SETUP.md) for detailed setup instructions.

## Message Format

Use `[project_name][hours]` format to specify projects and durations:

```
[project_1][6h] [project_2][2h]
• Completed testing on QA-3
• Approved batch for deployment
```

**Examples:**
- Single project: `[project_1][8h] Working on feature X`
- Multiple projects: `[project_1][6h] [project_2][2h] Various tasks`
- Decimal hours: `[project_1][6.5h]`

**Note:** Only one update per user per day. To modify, edit your original message.

## Environment Configuration

```env
# Project mappings (name:id pairs, comma-separated)
CLOCKIFY_PROJECTS=project_1:abc123,project_2:def456
```

## Tech Stack

- Node.js 24+
- TypeScript
- Slack Bolt SDK
- Clockify API
