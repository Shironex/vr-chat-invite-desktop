# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**VRChat Group Inviter** - A desktop application that automatically invites VRChat players to your group by monitoring game log files. Built with Electron, React 19, and TypeScript.

**Key Features:**
- Real-time VRChat log monitoring for player detection
- Automatic group invite queue with rate limiting
- VRChat authentication with 2FA support (TOTP/Email)
- Discord webhook notifications
- Configurable rate limits to avoid API bans
- Polish and English translations
- Dark/light/system theme support

## Commands

### Development
- `pnpm start` - Start the app in development mode with Vite hot reload
- `pnpm run dev` - Start with debug mode (opens debug console window)
- `pnpm run lint` - Run ESLint
- `pnpm run format:write` - Format all code
- `pnpm exec tsc --noEmit` - Type check without emitting files

### Testing
- `pnpm test` - Run unit tests once (Vitest)
- `pnpm test:watch` - Run unit tests in watch mode
- `pnpm test:e2e` - Run Playwright E2E tests
- `pnpm test:all` - Run all tests (unit + E2E)

Unit tests are in `src/tests/unit/`, E2E tests in `src/tests/e2e/`.

### Building
- `pnpm run dist:dir` - Build and package without installer (fast, for testing)
- `pnpm run dist` - Build and create NSIS installer

## Architecture

### VRChat Services (`src/helpers/vrchat/`)

1. **vrchat-auth.service.ts** - Authentication
   - Login with username/password
   - 2FA verification (TOTP, email OTP)
   - Session management with cookie storage
   - Auto-restore session on app start

2. **vrchat-api.service.ts** - API Calls
   - Send group invites
   - Get group information
   - Handle already-member detection

3. **log-monitor.service.ts** - Log File Watching
   - Watch VRChat log files with chokidar
   - Parse player join events
   - Extract user IDs and display names
   - Auto-detect latest log file

4. **invite-queue.service.ts** - Queue Management
   - Queue-based invite processing
   - Configurable batch size and delays
   - Rate limit protection with threshold pause
   - Real-time stats and callbacks

5. **settings.service.ts** - Settings Persistence
   - Rate limit settings with electron-store
   - VRChat path management
   - Auto-detect VRChat in Steam locations

6. **discord-webhook.service.ts** - Discord Notifications
   - Batched webhook sending
   - Success, warning, error channels
   - Rich embeds for invite results

### VRChat IPC Layer (`src/helpers/ipc/vrchat/`)

- **vrchat-channels.ts** - IPC channel constants
- **vrchat-context.ts** - Renderer API via contextBridge
- **vrchat-listeners.ts** - Main process handlers

### UI Components (`src/components/inviter/`)

- **InviterDashboard** - Main dashboard combining all components
- **LoginForm** - Username/password authentication
- **TwoFactorDialog** - 2FA verification
- **ConnectionStatus** - Logged-in user and group display
- **InviterStatsBar** - Sent/skipped/errors/queue counts
- **InviterControls** - Start/stop monitoring, launch VRChat
- **InviterLogs** - Activity log with filtering and search
- **RateLimitSettings** - Rate limit and VRChat path settings

### Configuration (`src/config/`)

**vrchat.config.ts** - Main configuration:
- `VRCHAT_GROUP.GROUP_ID` - Target group ID
- `VRCHAT_GROUP.GROUP_NAME` - Group display name
- `DISCORD_WEBHOOKS` - Webhook URLs for notifications
- `DEFAULT_RATE_LIMITS` - Default rate limit settings
- `MONITOR_CONFIG` - Log parsing patterns

**app.config.ts** - App metadata:
- `APP_NAME` - "VRChat Group Inviter"
- `APP_ID` - Windows notification ID
- Window dimensions and titles

**secrets.config.ts** - Encryption key for session storage. Regenerate for production deployments:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

## Key Patterns

### Adding New VRChat API Endpoint

1. Add method to `src/helpers/vrchat/vrchat-api.service.ts`
2. Add IPC channel to `src/helpers/ipc/vrchat/vrchat-channels.ts`
3. Add handler to `src/helpers/ipc/vrchat/vrchat-listeners.ts`
4. Add context method to `src/helpers/ipc/vrchat/vrchat-context.ts`
5. Add TypeScript type to `src/types.d.ts`

### Adding Translation

1. Edit `src/localization/i18n.ts`
2. Add key to both `pl` and `en` translations
3. Use with `const { t } = useTranslation(); t('key')`

### Discord Webhook Integration

Webhooks are configured in `src/config/vrchat.config.ts`:
```typescript
export const DISCORD_WEBHOOKS = {
  SUCCESS: "https://discord.com/api/webhooks/xxx/yyy",
  WARNING: "https://discord.com/api/webhooks/xxx/yyy",
  ERROR: "https://discord.com/api/webhooks/xxx/yyy",
};
```

Notifications are batched (5 second delay, max 4 per batch) to avoid Discord rate limits.

## Rate Limiting

Default settings in `DEFAULT_RATE_LIMITS`:
- `inviteBatchCount: 8` - Invites before pausing
- `inviteBatchDelay: 12` - Seconds to pause after batch
- `inviteDelayBetween: 2` - Seconds between individual invites
- `queueThreshold: 88` - Pause if queue exceeds this
- `queuePauseDelay: 600` - Seconds to pause at threshold (10 min)

These can be adjusted in Settings to be more/less aggressive.

## Log Parsing

VRChat logs are in `%LOCALAPPDATA%Low\VRChat\VRChat\`.

Player join pattern:
```
[Behaviour] OnPlayerJoined DisplayName (usr_xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx)
```

The log monitor watches for new log files and tails them for player join events.

## Security Notes

- Credentials sent only to `api.vrchat.cloud`
- Session cookies stored in electron-store (encrypted at OS level)
- CSP allows only VRChat API and Discord webhooks
- No telemetry or third-party analytics

## Important Files

| File | Purpose |
|------|---------|
| `src/config/vrchat.config.ts` | Group ID, webhooks, rate limits |
| `src/helpers/vrchat/*.ts` | Core VRChat services |
| `src/components/inviter/*.tsx` | UI components |
| `src/localization/i18n.ts` | Translations |
| `src/types.d.ts` | TypeScript declarations |

## Debugging

Run with debug console:
```bash
pnpm run dev
```

Key debug categories:
- `info` - General operations
- `network` - API calls
- `ipc` - IPC messages
- `success` - Successful invites
- `error` - Errors and failures
