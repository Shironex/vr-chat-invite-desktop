# Debug Console Implementation Guide

This document provides detailed instructions for AI agents to implement or migrate the enhanced debug console features to other Electron projects.

## Overview

The debug console is a powerful debugging tool with the following features:

1. **Tabbed Interface** - Console, Performance, State, Network, Timeline tabs
2. **Multi-Window Logging** - Track logs from multiple windows with color-coded badges
3. **12 Log Categories** - info, success, warn, error, debug, route, ipc, updater, perf, network, state, lifecycle
4. **Performance Profiler** - Memory metrics, IPC statistics, uptime tracking
5. **State Inspector** - View localStorage, app config, window state
6. **Timeline View** - Visual event timeline with bars
7. **Command Palette/REPL** - Execute JavaScript and built-in commands
8. **Network Inspector** - Capture and display network requests

---

## Architecture

### File Structure

```
src/
├── helpers/
│   ├── debug-mode.ts          # Main process debug system
│   ├── debug-logger.ts        # Renderer process logger wrapper
│   ├── window-registry.ts     # Window tracking for multi-window support
│   ├── network-interceptor.ts # Fetch interceptor for network tab
│   └── ipc/
│       └── debug/
│           ├── debug-channels.ts   # IPC channel constants
│           ├── debug-context.ts    # Preload context bridge
│           └── debug-listeners.ts  # Main process IPC handlers
├── debug-console.html         # Debug console UI (standalone HTML)
├── debug-console-preload.ts   # Preload script for debug console
└── types.d.ts                 # TypeScript type definitions
```

---

## Step-by-Step Implementation

### Step 1: Define Log Level Types

Add to `src/types.d.ts`:

```typescript
type DebugLogLevel =
  | "info"
  | "success"
  | "warn"
  | "error"
  | "debug"
  | "route"
  | "ipc"
  | "updater"
  | "perf"
  | "network"
  | "state"
  | "lifecycle";

interface DebugAPI {
  log: (level: DebugLogLevel, message: string, ...args: unknown[]) => void;
  info: (message: string, ...args: unknown[]) => void;
  success: (message: string, ...args: unknown[]) => void;
  warn: (message: string, ...args: unknown[]) => void;
  error: (message: string, ...args: unknown[]) => void;
  debug: (message: string, ...args: unknown[]) => void;
  route: (message: string, ...args: unknown[]) => void;
  ipc: (message: string, ...args: unknown[]) => void;
  updater: (message: string, ...args: unknown[]) => void;
  perf: (message: string, ...args: unknown[]) => void;
  network: (message: string, ...args: unknown[]) => void;
  state: (message: string, ...args: unknown[]) => void;
  lifecycle: (message: string, ...args: unknown[]) => void;
}

declare interface Window {
  debugAPI: DebugAPI;
}
```

### Step 2: Create Window Registry

Create `src/helpers/window-registry.ts`:

```typescript
import { BrowserWindow } from "electron";

interface WindowInfo {
  id: number;
  name: string;
  color: string;
}

const WINDOW_COLORS = [
  "#58a6ff", // Blue (Main)
  "#f0883e", // Orange
  "#a371f7", // Purple
  "#3fb950", // Green
  "#f778ba", // Pink
  "#ffd33d", // Yellow
];

class WindowRegistry {
  private windows: Map<number, WindowInfo> = new Map();
  private colorIndex = 0;

  register(window: BrowserWindow, name: string): WindowInfo {
    const info: WindowInfo = {
      id: window.id,
      name,
      color: WINDOW_COLORS[this.colorIndex % WINDOW_COLORS.length],
    };
    this.windows.set(window.id, info);
    this.colorIndex++;

    window.on("closed", () => this.windows.delete(window.id));
    return info;
  }

  get(windowId: number): WindowInfo | undefined {
    return this.windows.get(windowId);
  }

  getName(windowId: number): string {
    return this.windows.get(windowId)?.name ?? "Unknown";
  }

  getColor(windowId: number): string {
    return this.windows.get(windowId)?.color ?? "#8b949e";
  }
}

export const windowRegistry = new WindowRegistry();
```

### Step 3: Create Debug Mode Handler

Create `src/helpers/debug-mode.ts`:

```typescript
import log from "electron-log";
import { app, BrowserWindow } from "electron";
import path from "path";
import { windowRegistry } from "./window-registry";

let isDebugMode = false;
let debugConsoleWindow: BrowserWindow | null = null;

export function initializeDebugMode(): boolean {
  const hasDebugFlag = process.env.DEBUG === "1" || process.argv.includes("--debug");

  if (hasDebugFlag) {
    isDebugMode = true;
    log.transports.console.level = "debug";
    log.transports.file.level = "debug";
  }

  return isDebugMode;
}

export function isDebugEnabled(): boolean {
  return isDebugMode;
}

export function sendToDebugConsole(
  level: string,
  message: string,
  args: unknown[] = [],
  windowId?: number
): void {
  if (debugConsoleWindow && !debugConsoleWindow.isDestroyed()) {
    const windowInfo = windowId
      ? {
          id: windowId,
          name: windowRegistry.getName(windowId),
          color: windowRegistry.getColor(windowId),
        }
      : { id: 0, name: "Main", color: "#58a6ff" };

    debugConsoleWindow.webContents.send("debug:log", {
      level,
      message,
      args,
      window: windowInfo,
    });
  }
}

// Create debugLog object with all log levels
export const debugLog = {
  info: (msg: string, ...args: unknown[]) => {
    if (isDebugMode) {
      log.info(`ℹ️  ${msg}`, ...args);
      sendToDebugConsole("info", msg, args);
    }
  },
  // ... repeat for all log levels
};
```

### Step 4: Create Debug Console Preload

Create `src/debug-console-preload.ts`:

```typescript
import { ipcRenderer } from "electron";

interface WindowInfo {
  id: number;
  name: string;
  color: string;
}

interface DebugLogData {
  level: string;
  message: string;
  args: unknown[];
  window?: WindowInfo;
}

ipcRenderer.on("debug:log", (_event, data: DebugLogData) => {
  window.dispatchEvent(new CustomEvent("log", { detail: data }));
});
```

### Step 5: Create Debug Console HTML

The `debug-console.html` should include:

1. **Tab Navigation** - Buttons for switching between tabs
2. **Console Panel** - Log entries with filters
3. **Performance Panel** - Memory cards and IPC table
4. **State Panel** - Collapsible sections for localStorage, config, window state
5. **Network Panel** - Request list with status, method, URL, timing
6. **Timeline Panel** - Bar chart visualization
7. **REPL Input** - Command input with Run button
8. **Stats Bar** - Total, visible, errors, warnings, memory

Key CSS classes:
- `.tab-btn` / `.tab-btn.active` - Tab buttons
- `.tab-panel` / `.tab-panel.active` - Tab content panels
- `.log-entry` / `.log-entry.{level}` - Log entries with level colors
- `.window-badge` - Color-coded window identifier
- `.perf-card` / `.perf-card-value` - Performance metric cards
- `.state-section` / `.state-item` - State inspector sections
- `.network-entry` - Network request rows
- `.timeline-row` / `.timeline-bar` - Timeline visualization

Key JavaScript functions:
- `addLog(level, message, args, windowInfo)` - Add log entry
- `filterLogs()` - Apply level/search/window filters
- `trackIPCCall(message)` - Record IPC stats
- `addTimelineEvent(level, message, windowInfo)` - Add timeline event
- `executeREPL(input)` - Execute command or JavaScript
- `loadLocalStorage()` / `loadAppConfig()` / `loadWindowState()` - State inspection

### Step 6: Register Window in Main Process

In `main.ts`, after creating windows:

```typescript
import { windowRegistry } from "./helpers/window-registry";

// After BrowserWindow is created:
windowRegistry.register(mainWindow, "Main");
```

### Step 7: Create Renderer Logger

Create `src/helpers/debug-logger.ts`:

```typescript
export const debugLog = {
  info: (message: string, ...args: unknown[]) => {
    window.debugAPI?.info(message, ...args);
  },
  // ... repeat for all log levels
};
```

### Step 8: Create Network Interceptor

Create `src/helpers/network-interceptor.ts`:

```typescript
interface NetworkRequest {
  id: string;
  method: string;
  url: string;
  status: "pending" | "success" | "error";
  statusCode?: number;
  timing: number;
  size: number;
  error?: string;
}

let requestCounter = 0;

function generateRequestId(): string {
  return `req_${Date.now()}_${++requestCounter}`;
}

function sendNetworkEvent(request: NetworkRequest): void {
  if (window.debugAPI) {
    const message = `${request.method} ${request.url} [${request.statusCode || '...'}] ${request.timing}ms`;
    window.debugAPI.network(message, request);
  }
}

export function installNetworkInterceptor(): void {
  if ((window as any).__networkInterceptorInstalled) return;

  const originalFetch = window.fetch;

  window.fetch = async function (input, init) {
    const requestId = generateRequestId();
    const startTime = performance.now();
    const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
    const method = (init?.method || 'GET').toUpperCase();

    const request: NetworkRequest = {
      id: requestId,
      method,
      url,
      status: "pending",
      timing: 0,
      size: 0,
    };

    sendNetworkEvent(request);

    try {
      const response = await originalFetch.call(window, input, init);
      const endTime = performance.now();

      request.status = response.ok ? "success" : "error";
      request.statusCode = response.status;
      request.timing = Math.round(endTime - startTime);

      // Try to get size from response
      try {
        const blob = await response.clone().blob();
        request.size = blob.size;
      } catch {}

      sendNetworkEvent(request);
      return response;
    } catch (error) {
      request.status = "error";
      request.timing = Math.round(performance.now() - startTime);
      request.error = error.message;
      sendNetworkEvent(request);
      throw error;
    }
  };

  (window as any).__networkInterceptorInstalled = true;
}
```

### Step 9: Install Network Interceptor

In `App.tsx` or your renderer entry point:

```typescript
import { installNetworkInterceptor } from "./helpers/network-interceptor";

// Install before app renders
installNetworkInterceptor();
```

---

## Log Level Colors Reference

| Level | Emoji | Color | CSS |
|-------|-------|-------|-----|
| info | ℹ️ | Blue | #58a6ff |
| success | ✅ | Green | #3fb950 |
| warn | ⚠️ | Yellow | #d29922 |
| error | ❌ | Red | #f85149 |
| debug | 🔍 | Gray | #8b949e |
| route | 🧭 | Purple | #a371f7 |
| ipc | 📡 | Light Green | #56d364 |
| updater | 🔄 | Orange | #f7b731 |
| perf | ⚡ | Coral | #ff6b6b |
| network | 🌐 | Teal | #4ecdc4 |
| state | 📊 | Yellow | #ffe66d |
| lifecycle | 🔃 | Mint | #95e1d3 |

---

## REPL Built-in Commands

| Command | Description |
|---------|-------------|
| `clear` | Clear the console |
| `export` | Export logs to file |
| `help` | Show available commands |
| `scroll` | Toggle auto-scroll |
| `stats` | Show log statistics |
| `filter:X` | Toggle filter (e.g., `filter:error`) |

Any other input is executed as JavaScript using `eval()`.

---

## Integration Points

### Using Debug Logger in Components

```typescript
import { debugLog } from "@/helpers/debug-logger";

// In component or hook:
debugLog.route("Navigated to /settings");
debugLog.state("Theme changed", { from: "light", to: "dark" });
debugLog.perf("Component render time", { ms: 12.5 });
debugLog.lifecycle("App focus changed", { focused: true });
```

### Lifecycle Events to Track

- App focus/blur: `lifecycle`
- Route changes: `route`
- IPC calls: `ipc`
- State changes: `state`
- Performance metrics: `perf`
- Network requests: `network`

---

## Testing Debug Console

1. Run app with debug flag: `pnpm run start:debug`
2. Debug console window opens automatically
3. Try all tabs and verify data appears
4. Test REPL with `help` command
5. Test filters (level checkboxes, search, window filter)
6. Test export functionality

---

## Migration Checklist

- [ ] Copy type definitions to `types.d.ts`
- [ ] Create `window-registry.ts`
- [ ] Create `debug-mode.ts`
- [ ] Create `debug-console-preload.ts`
- [ ] Copy `debug-console.html`
- [ ] Create IPC channel files (channels, context, listeners)
- [ ] Update `main.ts` to initialize debug mode and register windows
- [ ] Create renderer `debug-logger.ts`
- [ ] Create `network-interceptor.ts`
- [ ] Install network interceptor in `App.tsx`
- [ ] Add debug scripts to `package.json`
- [ ] Test all features (especially Network tab with fetch requests)
