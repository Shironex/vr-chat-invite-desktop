# Template Setup Guide

This guide will help you customize the Electron Starter Template for your own project.

## Quick Start Checklist

Follow these steps to personalize the template:

### 1. Update Project Identity

**IMPORTANT: Start with the centralized config file!**

**In `src/config/app.config.ts` (recommended):**
- [ ] Update `APP_NAME` - Your application display name
- [ ] Update `APP_ID` - Your unique app ID (e.g., `com.yourcompany.yourapp`)
- [ ] Update `PRODUCT_NAME` - Usually same as APP_NAME
- [ ] Update `MAIN_WINDOW` - Window title and dimensions
- [ ] Update `DEBUG_CONSOLE` - Debug console title and settings
- [ ] Update `HTML_TITLE` - HTML page title

This config file is the **single source of truth** for your app's identity. All window titles, app names, and identifiers are automatically imported from this file.

**Then in `package.json`:**
- [ ] Change `name` to your project name (lowercase, no spaces)
- [ ] Change `productName` to match `PRODUCT_NAME` from config
- [ ] Update `description` with your app's description
- [ ] Update `version` (usually start with `0.1.0` or `1.0.0`)
- [ ] Change `author` name and email
- [ ] Update `repository.url` with your GitHub repository URL
- [ ] Update `build.appId` to match `APP_ID` from config
- [ ] Update `build.nsis.shortcutName` to match your app name
- [ ] Update `publish.owner` and `publish.repo` for auto-updates

**Finally in `index.html`:**
- [ ] Update `<title>` tag to match `HTML_TITLE` from config

**Note:** After updating the config file, you don't need to manually update `src/main.ts`, `src/helpers/debug-mode.ts`, or `src/localization/i18n.ts` - they automatically import values from the config!

### 2. Update Translations

**In `src/localization/i18n.ts`:**
- [ ] Add your own translation keys as needed
- [ ] Remove or modify existing keys based on your needs

**Note:** The `appName` translation is automatically imported from `src/config/app.config.ts` - no manual changes needed!

### 3. Replace App Icon

- [ ] Replace `src/assets/icon.ico` with your own icon (256x256 or larger recommended)
- [ ] For macOS: Add `icon.icns` file
- [ ] For Linux: Add `icon.png` file

### 4. Customize Routes

**Add new routes:**
1. Create a new file in `src/routes/` (e.g., `about.tsx`)
2. Use TanStack Router's file-based routing conventions
3. Export a route using `createFileRoute()`

**Example:**
```tsx
import { createFileRoute } from "@tanstack/react-router";

function AboutPage() {
  return <div>About Page</div>;
}

export const Route = createFileRoute("/about")({
  component: AboutPage,
});
```

4. Add navigation link in `src/components/Navbar.tsx`

### 5. Add Custom IPC Channels

To add new IPC communication between main and renderer:

1. **Create channel folder:**
   - Create `src/helpers/ipc/your-feature/`

2. **Define channels** (`your-feature-channels.ts`):
```typescript
export const YOUR_FEATURE_CHANNELS = {
  ACTION: "your-feature:action",
  RESPONSE: "your-feature:response",
};
```

3. **Expose to renderer** (`your-feature-context.ts`):
```typescript
import { contextBridge, ipcRenderer } from "electron";
import { YOUR_FEATURE_CHANNELS } from "./your-feature-channels";

export function exposeYourFeatureContext(): void {
  contextBridge.exposeInMainWorld("yourFeatureAPI", {
    doAction: () => ipcRenderer.invoke(YOUR_FEATURE_CHANNELS.ACTION),
  });
}
```

4. **Register listeners** (`your-feature-listeners.ts`):
```typescript
import { BrowserWindow, ipcMain } from "electron";
import { YOUR_FEATURE_CHANNELS } from "./your-feature-channels";

export function addYourFeatureListeners(mainWindow: BrowserWindow): void {
  ipcMain.handle(YOUR_FEATURE_CHANNELS.ACTION, async () => {
    // Your logic here
    return { success: true };
  });
}
```

5. **Update types** (`src/types.d.ts`):
```typescript
interface YourFeatureAPI {
  doAction: () => Promise<{ success: boolean }>;
}

declare interface Window {
  // ... existing APIs
  yourFeatureAPI: YourFeatureAPI;
}
```

6. **Register in main files:**
   - Import and call in `src/helpers/ipc/context-exposer.ts`
   - Import and call in `src/helpers/ipc/listeners-register.ts`

### 6. Add New shadcn-ui Components

Use the standard shadcn-ui CLI:

```bash
npx shadcn@latest add [component-name]
```

Components will be added to `src/components/ui/`.

### 7. Customize Theme

**Colors** (`src/styles/global.css`):
- Modify oklch color values in `:root` and `.dark` sections
- Update CSS variables for custom colors

### 8. Configure Auto-Updates

**For GitHub Releases:**
1. Ensure `repository.url` is correct in `package.json`
2. Set up `GH_TOKEN` environment variable for publishing
3. Run `pnpm run publish` to build and publish

**For other providers:**
- Modify `build.publish` in `package.json`
- See electron-builder docs for other providers

### 9. Update Tests

**Unit Tests** (`src/tests/unit/`):
- Remove example tests
- Add your own component and logic tests
- Run with `pnpm test` or `pnpm run test:watch`

**E2E Tests** (`src/tests/e2e/`):
- Update example tests for your app's workflow
- Run `pnpm run dist:dir` first, then `pnpm run test:e2e`

### 10. Customize Build Configuration

**electron-builder** (`package.json` `build` section):
- Configure target platforms
- Add file associations
- Configure auto-updater settings
- Add build resources

## Development Workflow

### Running the App

```bash
# Normal mode
pnpm start

# Debug mode (opens debug console)
pnpm run start:debug
```

### Building

```bash
# Build for development (no installer)
pnpm run dist:dir

# Build with installer
pnpm run dist

# Build and publish to GitHub
pnpm run publish
```

### Testing

```bash
# Unit tests
pnpm test

# Unit tests (watch mode)
pnpm run test:watch

# E2E tests (requires dist:dir first)
pnpm run test:e2e

# All tests
pnpm run test:all
```

### Code Quality

```bash
# Lint code
pnpm run lint

# Format check
pnpm run format

# Format write
pnpm run format:write
```

## Debug Mode Features

Enable debug mode to access:
- Separate debug console window
- Colored log categories (info, success, warn, error, debug, route, ipc)
- DevTools auto-open
- Detailed logging to file

**Enable:**
```bash
# Development
pnpm run start:debug

# Production
your-app.exe --debug
```

**Add custom debug logs:**
```typescript
// Main process
import { debugLog } from "@/helpers/debug-mode";
debugLog.info("Message");

// Renderer process
import { debugLog } from "@/helpers/debug-logger";
debugLog.info("Message");
```

## Tips and Best Practices

1. **Keep the IPC pattern**: The centralized IPC structure makes it easy to add features
2. **Use TypeScript**: Full type safety across main and renderer processes
3. **Leverage shadcn-ui**: Pre-built accessible components save time
4. **Use debug mode**: Makes development and troubleshooting easier
5. **Test early**: Write tests as you build features
6. **Follow the patterns**: The template establishes good patterns - stick with them

## Removing Template Examples

Once you're comfortable, you can:
- Remove the welcome page in `src/routes/index.tsx`
- Simplify `src/components/Navbar.tsx` further
- Remove unused translation keys
- Remove this file (TEMPLATE_SETUP.md)

## Need Help?

- **Electron docs**: https://electronjs.org/docs
- **React 19 docs**: https://react.dev
- **TanStack Router**: https://tanstack.com/router
- **shadcn-ui**: https://ui.shadcn.com
- **i18next**: https://i18next.com

## Common Issues

### Build fails with "file is locked"
- Close all instances of your app
- Run `taskkill /F /IM your-app.exe /T` (Windows)
- Wait a few seconds, then rebuild

### Auto-update not working
- Verify `publish` config in package.json
- Check GitHub release has `latest.yml` file
- Ensure app is signed (required for some platforms)

### TypeScript errors after adding IPC
- Update `src/types.d.ts` with new interface
- Restart TypeScript server in your IDE

Good luck with your project! 🚀
