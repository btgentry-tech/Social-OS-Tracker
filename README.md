# Social OS

A deterministic, offline-first strategic engine for content creators. No AI hallucinations.

## Setup Instructions

This app operates directly in your browser using local storage for persistence. To get started, you will need a YouTube Data API v3 key.

### 1. Get YouTube Credentials
1. Go to the [Google Cloud Console](https://console.cloud.google.com/).
2. Create a new project.
3. Navigate to **APIs & Services > Library**.
4. Search for "YouTube Data API v3" and enable it.
5. Go to **Credentials** and click "Create Credentials" > "API Key".
6. Copy this API key.
7. To find your Channel ID, go to your YouTube channel's homepage and look at the URL (e.g., `youtube.com/channel/UC...` where the UC... part is your ID) or go to YouTube Studio > Settings > Channel > Advanced Settings > Manage YouTube Account > View Advanced Settings.

### 2. Connect
1. Navigate to the **Connect** tab in Social OS.
2. Enter your API Key and Channel ID.
   - Note: The API key is held in session memory only (it vanishes when you refresh). The Channel ID and synced data are persisted to your local browser storage.
3. Click **Test Connection**.
4. Click **Sync Now** to ingest your public metadata.

### 3. Generate Brief
Navigate to the **Brief** tab. The deterministic engine analyzes your recent performance vs historical baselines to generate:
- Momentum scoring
- Format fatigue penalties
- 4 strict move archetypes (Leverage, Reinforcement, Experiment, Structural)

### Data Privacy & Persistence
- **No Backend**: This application is a strictly frontend React mockup.
- **Persistence**: Content library, execution history, and feedback loops are saved directly to your browser's Local Storage (acting as the `db.json`).
- **Data Scope**: We only pull public metadata (titles, views, tags, dates).
