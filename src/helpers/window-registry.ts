import { BrowserWindow } from "electron";

interface WindowInfo {
  id: number;
  name: string;
  color: string;
}

// Predefined colors for windows (cycling through these)
const WINDOW_COLORS = [
  "#58a6ff", // Blue (Main)
  "#f0883e", // Orange
  "#a371f7", // Purple
  "#3fb950", // Green
  "#f778ba", // Pink
  "#ffd33d", // Yellow
  "#79c0ff", // Light Blue
  "#d2a8ff", // Light Purple
];

class WindowRegistry {
  private windows: Map<number, WindowInfo> = new Map();
  private colorIndex = 0;

  /**
   * Register a new window with a name
   */
  register(window: BrowserWindow, name: string): WindowInfo {
    const info: WindowInfo = {
      id: window.id,
      name,
      color: WINDOW_COLORS[this.colorIndex % WINDOW_COLORS.length],
    };

    this.windows.set(window.id, info);
    this.colorIndex++;

    // Auto-remove when window is closed
    window.on("closed", () => {
      this.windows.delete(window.id);
    });

    return info;
  }

  /**
   * Get window info by ID
   */
  get(windowId: number): WindowInfo | undefined {
    return this.windows.get(windowId);
  }

  /**
   * Get all registered windows
   */
  getAll(): WindowInfo[] {
    return Array.from(this.windows.values());
  }

  /**
   * Get window name by ID (returns "Unknown" if not found)
   */
  getName(windowId: number): string {
    return this.windows.get(windowId)?.name ?? "Unknown";
  }

  /**
   * Get window color by ID
   */
  getColor(windowId: number): string {
    return this.windows.get(windowId)?.color ?? "#8b949e";
  }
}

export const windowRegistry = new WindowRegistry();
