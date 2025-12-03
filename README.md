# VRChat Group Inviter

A desktop application for automatically inviting VRChat players to your group. Built with Electron, React 19, and TypeScript.

## Features

### Core Functionality
- **Automatic Player Detection** - Monitors VRChat log files in real-time to detect players joining your world
- **Smart Invite Queue** - Automatically queues detected players for group invites
- **Rate Limit Protection** - Configurable delays and batch sizes to avoid VRChat API limits
- **Discord Notifications** - Send webhook notifications for invites, skips, and errors

### User Interface
- **Clean Dashboard** - View stats, logs, and controls in one place
- **Activity Log** - Real-time log with filtering and search
- **Rate Limit Settings** - Configure invite timing to stay under VRChat limits
- **VRChat Path Detection** - Auto-detect or manually select VRChat installation

### Technical
- **Secure Authentication** - Login with VRChat credentials, 2FA support (TOTP/Email)
- **Session Persistence** - Stay logged in between app restarts
- **Bilingual UI** - Polish and English translations
- **Dark/Light Theme** - System theme support

## Quick Start

### Prerequisites
- Node.js 18+ (20+ recommended)
- pnpm 9+ (`npm install -g pnpm`)
- VRChat account with group admin permissions

### Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/vr-chat-invite-desktop.git
cd vr-chat-invite-desktop

# Install dependencies
pnpm install

# Start in development mode
pnpm start
```

### Configuration

Before using, edit `src/config/vrchat.config.ts`:

```typescript
export const VRCHAT_GROUP = {
  GROUP_ID: "grp_xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx", // Your group ID
  GROUP_NAME: "Your Group Name",
};

export const DISCORD_WEBHOOKS = {
  SUCCESS: "https://discord.com/api/webhooks/...", // Optional
  WARNING: "https://discord.com/api/webhooks/...", // Optional
  ERROR: "https://discord.com/api/webhooks/...",   // Optional
};
```

## Usage

1. **Login** - Enter your VRChat username and password
2. **Verify 2FA** - If enabled, enter your authenticator or email code
3. **Start Monitoring** - Click "Start Monitoring" to watch for player joins
4. **Launch VRChat** - Optionally launch VRChat from the app
5. **Watch the Magic** - Players joining your world are automatically invited

### Rate Limit Settings

Access via the sliders icon in the dashboard:

| Setting | Default | Description |
|---------|---------|-------------|
| Batch Size | 8 | Invites before pausing |
| Batch Delay | 12s | Pause duration after batch |
| Delay Between | 2s | Wait between invites |
| Queue Threshold | 88 | Pause if queue exceeds |
| Pause Duration | 600s | How long to pause at threshold |

## Development

```bash
# Start with hot reload
pnpm start

# Start with debug console
pnpm run dev

# Run linter
pnpm run lint

# Type check
pnpm exec tsc --noEmit
```

## Building

```bash
# Build without installer (for testing)
pnpm run dist:dir

# Build with NSIS installer
pnpm run dist
```

Output goes to `release/` directory.

## Project Structure

```
src/
├── components/inviter/     # UI components
│   ├── InviterDashboard    # Main dashboard
│   ├── LoginForm           # Authentication
│   ├── InviterLogs         # Activity log
│   └── RateLimitSettings   # Settings form
│
├── helpers/vrchat/         # VRChat services
│   ├── vrchat-auth         # Authentication
│   ├── vrchat-api          # API calls
│   ├── log-monitor         # Log file watching
│   ├── invite-queue        # Queue management
│   └── discord-webhook     # Discord notifications
│
├── helpers/ipc/vrchat/     # IPC layer
│   ├── vrchat-channels     # Channel constants
│   ├── vrchat-context      # Renderer bridge
│   └── vrchat-listeners    # Main handlers
│
├── config/
│   └── vrchat.config.ts    # Group and webhook config
│
└── localization/
    └── i18n.ts             # Polish/English translations
```

## Security

- Credentials are only sent to VRChat's official API
- Session cookies stored securely in app data
- No data sent to third parties (except optional Discord webhooks)
- Open source - audit the code yourself

## Troubleshooting

### Login fails
- Check your username and password
- Ensure 2FA is being handled correctly
- VRChat may have temporary API issues

### Players not detected
- Make sure VRChat is running
- Monitoring must be started before players join
- Check the VRChat path is correctly configured

### Invites failing
- Verify your group ID is correct
- Ensure you have invite permissions in the group
- Check rate limit settings aren't too aggressive

## License

MIT License - see [LICENSE](./LICENSE) for details.

## Credits

Built with:
- [Electron](https://electronjs.org) - Desktop framework
- [React 19](https://react.dev) - UI framework
- [TypeScript](https://typescriptlang.org) - Type safety
- [shadcn/ui](https://ui.shadcn.com) - UI components
- [Tailwind CSS](https://tailwindcss.com) - Styling
- [chokidar](https://github.com/paulmillr/chokidar) - File watching

Based on the [Electron Starter Template](https://github.com/example/electron-starter-template).
