# Slack Bot Clockify - Setup Guide

## Overview
This bot automatically creates Clockify time entries based on daily update messages in a Slack channel.

## Prerequisites
- Node.js >= 24.0.0
- A Slack workspace with admin access
- A Clockify account

---

## 1. Slack App Setup

### Create a Slack App
1. Go to [Slack API Apps](https://api.slack.com/apps)
2. Click "Create New App" → "From scratch"
3. Name it (e.g., "Clockify Bot") and select your workspace

### Enable Socket Mode
1. Go to **Socket Mode** in the left sidebar
2. Enable Socket Mode
3. Create an app-level token with `connections:write` scope
4. **Copy the token** starting with `xapp-` → This is your `SLACK_APP_TOKEN` 


### Configure OAuth & Permissions
1. Go to **OAuth & Permissions**
2. Under **Bot Token Scopes**, add:
   - `channels:history` - Read messages in public channels
   - `channels:read` - View basic channel info
   - `chat:write` - Send messages
   - `reactions:write` - Add reactions to messages
   - `users:read` - View users and their emails
   - `users:read.email` - View email addresses

3. Click **Install to Workspace**
4. **Copy the Bot Token** starting with `xoxb-` → This is your `SLACK_BOT_TOKEN`



### Get Signing Secret
1. Go to **Basic Information**
2. Under **App Credentials**, find **Signing Secret**
3. **Copy it** → This is your `SLACK_SIGNING_SECRET`



### Subscribe to Events
1. Go to **Event Subscriptions**
2. Enable Events
3. Under **Subscribe to bot events**, add:
   - `message.channels` - Messages in public channels

### Get Channel ID
1. In Slack, right-click on the channel you want to monitor
2. Click "View channel details"
3. At the bottom, **copy the Channel ID** starting with `C` → This is your `SLACK_CHANNEL_ID`



### Add Bot to Channel
1. In Slack, go to the channel
2. Type `/invite @YourBotName` or add it via channel settings

---

## 2. Clockify Setup

### Get API Key
1. Log in to [Clockify](https://clockify.me)
2. Click on your profile icon → **Profile Settings**
3. Scroll down to **API Key**
4. Click "Generate" if not already generated
5. **Copy the API key** → This is your `CLOCKIFY_API_KEY`



### Get Workspace ID
1. Go to [Clockify Settings](https://clockify.me/workspaces)
2. Click on your workspace
3. Look at the URL: `https://clockify.me/workspaces/WORKSPACE_ID/settings`
4. **Copy the ID** from the URL → This is your `CLOCKIFY_WORKSPACE_ID`


Alternatively, use the API:
```bash
curl -H "X-Api-Key: YOUR_API_KEY" https://api.clockify.me/api/v1/workspaces
```

### Get Project IDs

#### Option 1: Via Clockify UI
1. Go to **Projects** in Clockify
2. Click on your first project (e.g., "Mimir")
3. Look at the URL: `https://clockify.me/projects/PROJECT_ID/edit`
4. **Copy the ID** → This is your `CLOCKIFY_PROJECT_1_ID`
5. Repeat for your second project (e.g., "Mimir-Maintenance") → This is your `CLOCKIFY_PROJECT_2_ID`


#### Option 2: Via API
```bash
curl -H "X-Api-Key: YOUR_API_KEY" \
  "https://api.clockify.me/api/v1/workspaces/YOUR_WORKSPACE_ID/projects"
```

Find your two projects in the response and copy their IDs.

---

## 3. Environment Configuration

Create a `.env` file in the project root with the following variables:

# Slack Configuration
SLACK_BOT_TOKEN=xoxb-your-bot-token
SLACK_SIGNING_SECRET=your-signing-secret
SLACK_APP_TOKEN=xapp-your-app-token
SLACK_CHANNEL_ID=C1234567890

# Clockify Configuration
CLOCKIFY_API_KEY=your-clockify-api-key
CLOCKIFY_WORKSPACE_ID=your-workspace-id

# Project mappings (name:id pairs, comma-separated)
# Example: project_1:abc123,project_2:def456
CLOCKIFY_PROJECTS=project_1:your-project-1-id,project_2:your-project-2-id

# Timezone
TIMEZONE=Asia/Dhaka

# Server Configuration
PORT=3000

---

## 4. Running the Bot

### Install Dependencies
```bash
npm install
```

### Development Mode
```bash
npm run dev
```

### Production Mode
```bash
npm run build
npm start
```

---

## 5. How It Works

### Message Format
Use `[project_name][hours]` format to specify projects and durations:

```
[project_1][6h] [project_2][2h]
• Completed testing on QA-3
• Approved batch for deployment
```

**Examples:**
- Single project: `[project_1][8h]`
- Multiple projects: `[project_1][6h] [project_2][2h]`
- Decimal hours: `[project_1][6.5h]`

**Note:** Only one update per user per day. To modify, edit your original message.

### Time Entry
- Start time: 9:00 AM (entries are scheduled sequentially)
- Duration: As specified in the message
- Description: Message text (without project tags)

### Edit/Delete Sync
- **Edit a message**: All entries are recreated with new project/duration
- **Edit to remove project tags**: All entries are deleted
- **Delete a message**: All entries are deleted

### Feedback
- ✅ Reaction on message = Entries created
- ✏️ Reaction = Entries updated
- Ephemeral messages show success/failure details

---

## 6. Troubleshooting

### "Unknown project(s)"
- Check that the project name matches exactly what's in `CLOCKIFY_PROJECTS`
- Project names are case-insensitive

### "Could not find your email address"
- Ensure your Slack profile has an email set
- The bot needs `users:read.email` scope

### "Could not find a Clockify user"
- Ensure your Clockify account uses the same email as Slack
- Check that you're in the correct Clockify workspace

### Bot not responding
- Check if the bot is added to the channel
- Verify Socket Mode is enabled
- Check that `message.channels` event is subscribed

### Time entry not created
- Only working days (Mon-Fri) create entries
- Message must use `[project][hours]` format
- Check the bot's console logs for errors
