# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is the **Electron Starter Template** - a production-ready template for building modern Electron applications with React 19, TypeScript, and comprehensive tooling. It serves as a starting point for new Electron projects.

**Key Features:**
- React 19 with Compiler for automatic optimization
- TypeScript with full type safety across processes
- shadcn-ui components with Tailwind CSS 4
- i18next internationalization (Polish/English template)
- TanStack Router with file-based routing
- Dark/light/system theme support (with flash prevention)
- Window state persistence (size, position, maximized state)
- Custom debug mode with separate console window
- Auto-updater with custom UI (release notes, download progress, changelog history)
- Vitest + Playwright testing setup
- Well-structured IPC communication pattern
- Type-safe IPC schema with timeout/cancellation support
- Content Security Policy (CSP) for enhanced security
- Environment variable validation
- Toast/notification system (Sonner)
- Offline detection & handling

## Commands

### Development
- `pnpm start` - Start the app in development mode with Vite hot reload
- `pnpm run start:debug` - Start with debug mode (opens debug console window)
- `pnpm run start:debug:win` - Windows-specific debug mode command
- `pnpm run lint` - Run ESLint
- `pnpm run format` - Check formatting with Prettier
- `pnpm run format:write` - Format all code

### Testing
- `pnpm test` - Run Vitest unit tests once
- `pnpm run test:watch` - Run Vitest in watch mode
- `pnpm run test:unit` - Alias for test:watch
- `pnpm run test:e2e` - Run Playwright E2E tests (requires `dist:dir` first)
- `pnpm run test:all` - Run all tests

**IMPORTANT**: E2E tests require the app to be packaged first with `pnpm run dist:dir`.

### Building and Distribution
- `pnpm run build` - Build the app (no packaging)
- `pnpm run dist:dir` - Build and package without installer (fast, for testing)
- `pnpm run dist` - Build and create NSIS installer
- `pnpm run publish` - Build and publish to GitHub Releases (auto-update)

**Note**: Uses **electron-builder** with NSIS (not Electron Forge). Output goes to `release/`.

## Architecture

### Centralized App Configuration

**Location:** `src/config/app.config.ts`

This is the **single source of truth** for all app metadata:
- `APP_NAME` - Application display name (used in notifications, taskbar, i18n)
- `APP_ID` - Unique app identifier (Windows notification ID)
- `PRODUCT_NAME` - Product name (should match package.json)
- `MAIN_WINDOW` - Main window configuration (title, width, height)
- `DEBUG_CONSOLE` - Debug console configuration (title, dimensions, colors)
- `HTML_TITLE` - HTML page title

**Files that import from config:**
- `src/main.ts` - Uses APP_NAME, APP_ID, MAIN_WINDOW
- `src/helpers/debug-mode.ts` - Uses DEBUG_CONSOLE
- `src/localization/i18n.ts` - Uses APP_NAME for appName translation

**To customize:** Edit `src/config/app.config.ts` first, then update `package.json` to match.

### Electron Process Model

1. **Main Process** (`src/main.ts`)
   - Creates and manages BrowserWindow
   - Persists window state (size, position, maximized) via electron-window-state
   - Registers IPC listeners via `registerListeners()`
   - Dynamically imports React DevTools in development
   - Initializes auto-updater
   - Handles app lifecycle

2. **Preload Script** (`src/preload.ts`)
   - Runs in isolated context
   - Exposes IPC contexts via `exposeContexts()`
   - Uses `contextBridge` for security

3. **Renderer Process** (`src/renderer.ts`)
   - Entry point for React app
   - Renders `App.tsx` which provides routing

### IPC Communication Pattern

Centralized IPC structure in `src/helpers/ipc/`:

**Pattern for adding new IPC features:**
1. Create folder: `src/helpers/ipc/feature/`
2. Add `feature-channels.ts` with channel constants
3. Add `feature-context.ts` with contextBridge exposure
4. Add `feature-listeners.ts` with ipcMain handlers
5. Update `context-exposer.ts` and `listeners-register.ts`
6. Add TypeScript types to `src/types.d.ts`

**Current IPC Features:**
- `theme/` - Theme management (dark/light/system)
- `window/` - Window controls (minimize/maximize/close)
- `debug/` - Debug logging system
- `updater/` - Auto-updater events and commands

### Application Structure

**Core Components:**
- `BaseLayout.tsx` - Main layout with title bar and navbar
- `Navbar.tsx` - Navigation with active route highlighting and changelog button
- `DragWindowRegion.tsx` - Custom draggable title bar
- `ToggleTheme.tsx` - Theme switcher component
- `LangToggle.tsx` - Language switcher component
- `SettingsModal.tsx` - Application settings UI
- `UpdateDialog.tsx` - Auto-update notification with release notes and download progress
- `ChangelogHistoryDialog.tsx` - GitHub releases history viewer

**Routes:**
- `/` - Welcome page showing template features

### Custom Title Bar

Uses hidden native title bar with custom window controls:
- Platform-specific handling (macOS: `hiddenInset`, Windows/Linux: `hidden`)
- Custom controls via IPC (`src/helpers/ipc/window/`)
- Draggable region component

### Theme System

- Light/dark/system modes
- Persistent storage via IPC
- oklch color space (Tailwind CSS 4)
- Smooth transitions
- `syncThemeWithLocal()` helper
- **Flash prevention**: Inline script applies theme before React loads to prevent dark mode flash

### Internationalization

i18next with Polish and English:
- Configuration: `src/localization/i18n.ts`
- Helper: `updateAppLanguage()` in `language_helpers.ts`
- Minimal template translations provided

### Routing

TanStack Router with memory-based history:
- File-based routing in `src/routes/`
- Route tree auto-generated: `src/routeTree.gen.ts` (gitignored)
- Base layout in `__root.tsx`

### Auto-Update System

electron-updater + NSIS with custom React UI:

**Architecture:**
- Core: `src/helpers/updater/auto-updater.ts` - electron-updater setup
- IPC: `src/helpers/ipc/updater/` - channels, context, listeners
- UI: `src/components/UpdateDialog.tsx` - update notification
- History: `src/components/ChangelogHistoryDialog.tsx` - all releases viewer

**Features:**
- Custom update dialog with Markdown release notes
- User-controlled downloads (`autoDownload: false`)
- Real-time download progress bar with speed/ETA
- Changelog history button in navbar (fetches from GitHub API)
- Checks 3 seconds after start, then hourly
- Logs to `%APPDATA%\electron-app\logs/main.log`

**Configuration:**
1. Update `src/config/app.config.ts`:
   ```typescript
   export const GITHUB_CONFIG = {
     owner: "yourusername",
     repo: "your-repo",
   };
   ```
2. Update `package.json` build.publish section to match

**Testing the Update UI (DevTools console):**
```javascript
// Show update available dialog with mock release notes
window.updaterAPI._testShowUpdate()

// Simulate full download flow (progress bar + completion)
window.updaterAPI._testSimulateDownload()
```

**Publishing:**
1. Bump version in `package.json`
2. Update `repository.url`, `publish.owner/repo`
3. Run `pnpm run publish`
4. Publish draft GitHub release with Markdown release notes

**Release Notes Format:**
See `docs/CHANGELOG.md` for example format. Supports full Markdown (headers, lists, code, bold, links).

### Debug Mode System

Comprehensive debug mode with separate console window:

**Components:**
1. `src/helpers/debug-mode.ts` - Main process debug system
2. `src/debug-console.html` - Standalone debug UI
3. `src/helpers/ipc/debug/` - IPC bridge
4. `src/helpers/debug-logger.ts` - Renderer logger

**Enable:**
- Development: `pnpm run start:debug`
- Production: `--debug` flag

**Features:**
- Separate console window
- Colored logs by category
- Auto-open DevTools
- Export logs

**Log Categories:**
- `info` - General information
- `success` - Successful operations
- `warn` - Warnings
- `error` - Errors
- `debug` - Debug information
- `route` - Navigation events
- `ipc` - IPC communication
- `updater` - Auto-updater events

**Debug Console Features:**
- Log level filters (show/hide by type)
- Real-time search with highlighting
- Auto-scroll toggle with automatic detection
- Memory usage monitor (heap used/total)
- Export logs to file
- Log rotation (max 10,000 entries)

### UI Components

- **shadcn-ui**: `src/components/ui/`
- **Tailwind CSS 4**: Utility-first with oklch colors
- **Lucide React**: Icon library
- **Geist & Tomorrow fonts**: Custom fonts

### Build System

Vite + vite-plugin-electron:
- Single config: `vite.config.mts`
- Main entry: `src/main.ts` → `dist-electron/main.js`
- Preload: `src/preload.ts` → `dist-electron/preload.js`
- Renderer: Vite build → `dist/`

### Testing

- **Vitest**: Unit tests with jsdom (`src/tests/unit/`)
- **Playwright**: E2E tests (`src/tests/e2e/`)
- **Coverage**: V8 provider

### Security Features

**Content Security Policy (CSP)**
- Location: `src/helpers/security/csp.ts`
- Applied programmatically via Electron session headers
- Configured for Vite dev server and production
- Prevents XSS attacks and unauthorized resource loading
- Navigation prevention to external URLs

**Environment Variable Validation**
- Location: `src/helpers/env-validation.ts`
- Validates `VITE_DEV_SERVER_URL` and `NODE_ENV` at startup
- Provides helpful error messages for misconfigurations
- Helper functions: `isDevelopment()`, `isProduction()`, `getDevServerUrl()`
- Early validation prevents runtime errors

### IPC Enhancements

**Type-Safe IPC with Advanced Features** (`src/helpers/ipc/ipc-schema.ts`)

1. **Basic Type-Safe IPC**:
   - `typedInvoke<T>(channel, ...args)` - Type-safe invoke
   - `typedSend<T>(channel, ...args)` - Type-safe send

2. **Timeout Support**:
   ```typescript
   const theme = await typedInvokeWithTimeout("theme:current", {
     timeout: 5000
   });
   ```
   - Prevents hanging requests
   - Configurable timeout (default 10 seconds)
   - Throws error when timeout is reached

3. **Cancellable Requests**:
   ```typescript
   const request = cancellableInvoke("theme:current");
   request.promise.then(theme => console.log(theme));
   request.cancel(); // Cancel if needed
   ```
   - Cancel in-flight IPC requests
   - Useful for component unmounting or user cancellation

### Toast/Notification System

**Sonner Integration** (`src/components/ui/sonner.tsx`)
- Modern toast notifications with Sonner library
- Automatic theme support (follows app theme)
- Integrated in `App.tsx`
- Usage:
  ```typescript
  import { toast } from "sonner";

  toast.success("Operation successful");
  toast.error("Something went wrong");
  toast.info("Information message");
  ```

### Offline Detection

**Network Status Monitoring**
- Hook: `useOnlineStatus()` (`src/hooks/use-online-status.ts`)
- Component: `OfflineIndicator` (`src/components/OfflineIndicator.tsx`)
- Automatic toast notifications when going offline/online
- Real-time status updates
- Integrated debug logging for network events

## Customizing the Template

Users should:
1. **Update `src/config/app.config.ts`** - Single source of truth for app identity
2. Read `TEMPLATE_SETUP.md` for full customization guide
3. Update `package.json` metadata to match config values
4. Replace `src/assets/icon.ico`
5. Add routes in `src/routes/`
6. Customize theme in `src/styles/global.css`

**IMPORTANT:** Always start with `src/config/app.config.ts` - it automatically updates window titles, app names, and debug console titles throughout the app.

## Adding shadcn-ui Components

```bash
npx shadcn@latest add [component-name]
```

Components added to `src/components/ui/` with config from `components.json`.

## Common Development Tasks

### Add New Route

1. Create `src/routes/page-name.tsx`
2. Export route with `createFileRoute()`
3. Add nav link in `Navbar.tsx` if needed

### Add New IPC Channel

1. Create `src/helpers/ipc/feature/` folder
2. Add channels, context, and listeners files
3. Register in `context-exposer.ts` and `listeners-register.ts`
4. Update `src/types.d.ts`

### Add Translation Key

1. Edit `src/localization/i18n.ts`
2. Add key to both `pl` and `en` translations
3. Use with `const { t } = useTranslation(); t('key')`

### Add Debug Log Category

1. Update `src/types.d.ts` DebugAPI interface
2. Update `src/helpers/debug-mode.ts` debugLog object
3. Update `src/helpers/debug-logger.ts`
4. Update `src/helpers/ipc/debug/debug-context.ts`
5. Update `src/helpers/ipc/debug/debug-listeners.ts`
6. Add styling to `src/debug-console.html`

## Important Notes

- **NOT using Electron Forge** - migrated to electron-builder
- **Context isolation enabled** - Always use contextBridge
- **No remote module** - Modern IPC only
- **React Compiler enabled** - Automatic optimization
- **File locking**: Close app before rebuilding

## Template Philosophy

This template provides:
- ✅ Complete infrastructure (routing, i18n, theming, IPC)
- ✅ Best practices and patterns
- ✅ Minimal example code
- ✅ Extensive documentation
- ✅ Ready for customization

**Goal**: Get started quickly with production-quality foundations.

