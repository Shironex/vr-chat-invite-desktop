# VRChat Group Inviter

A Windows desktop application that automatically sends VRChat group invites to players who join your world. The app monitors VRChat's log files in real-time, detects player join events, and sends group invitations through the VRChat API.

## How It Works

1. **Log Monitoring** - Watches VRChat's `output_log_*.txt` files for `OnPlayerJoined` events
2. **Player Detection** - Extracts player display names and user IDs from log entries
3. **Invite Queue** - Queues detected players and processes invites with rate limiting
4. **API Integration** - Sends group invites via VRChat's authenticated API

## Features

- Real-time VRChat log file monitoring with chokidar
- Automatic group invite queue with configurable rate limits
- VRChat authentication with 2FA support (TOTP and email codes)
- Discord webhook notifications for invite results
- Session persistence between app restarts
- Polish and English UI translations
- Dark/light/system theme support

## Quick Start

### Prerequisites

- Windows (VRChat log paths are Windows-specific)
- Node.js 18+ (20+ recommended)
- pnpm 9+ (`npm install -g pnpm`)
- VRChat account with group invite permissions

### Installation

```bash
git clone https://github.com/Shironex/vr-chat-invite-desktop.git
cd vr-chat-invite-desktop
pnpm install
```

### Configuration

Edit `src/config/vrchat.config.ts` with your group details:

```typescript
export const VRCHAT_GROUP = {
  GROUP_ID: "grp_xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
  GROUP_NAME: "Your Group Name",
};
```

Optionally configure Discord webhooks in Settings after launching the app.

### Running

```bash
pnpm start
```

## Usage

1. **Login** - Enter your VRChat credentials
2. **Verify 2FA** - Complete TOTP or email verification if enabled
3. **Start Monitoring** - Click "Start Monitoring" to begin watching logs
4. **Join a World** - Launch VRChat and join a world
5. **Automatic Invites** - Players joining your world are automatically invited to your group

## Rate Limit Settings

Configure in Settings to avoid VRChat API limits:

| Setting | Default | Description |
|---------|---------|-------------|
| Batch Size | 8 | Invites sent before pausing |
| Batch Delay | 12s | Pause duration after batch |
| Delay Between | 2s | Wait between individual invites |
| Queue Threshold | 88 | Pause if queue exceeds this |
| Pause Duration | 600s | How long to pause at threshold |

## Development

```bash
pnpm start          # Development with hot reload
pnpm run dev        # Development with debug console
pnpm run lint       # Run ESLint
pnpm test           # Run unit tests
pnpm test:e2e       # Run E2E tests
```

## Building

```bash
pnpm run dist:dir   # Build without installer (for testing)
pnpm run dist       # Build with NSIS installer
```

Output is in the `release/` directory.

## Tech Stack

- [Electron](https://electronjs.org) - Desktop framework
- [React 19](https://react.dev) - UI framework
- [TypeScript](https://typescriptlang.org) - Type safety
- [Vite](https://vitejs.dev) - Build tool
- [shadcn/ui](https://ui.shadcn.com) - UI components
- [Tailwind CSS](https://tailwindcss.com) - Styling
- [chokidar](https://github.com/paulmillr/chokidar) - File watching
- [Vitest](https://vitest.dev) - Unit testing
- [Playwright](https://playwright.dev) - E2E testing

## Security

- Credentials are only sent to VRChat's official API (`api.vrchat.cloud`)
- Session cookies stored in electron-store (OS-level encryption)
- No telemetry or third-party analytics
- Open source - audit the code yourself

## Troubleshooting

**Login fails**
- Verify credentials are correct
- Check 2FA code timing (TOTP codes expire quickly)
- VRChat API may have temporary issues

**Players not detected**
- Ensure VRChat is running
- Start monitoring before joining a world
- Verify VRChat path in Settings points to correct log directory

**Invites failing**
- Confirm group ID is correct in config
- Verify you have invite permissions in the group
- Check if rate limits are too aggressive

## License

MIT License - see [LICENSE](./LICENSE) for details.
