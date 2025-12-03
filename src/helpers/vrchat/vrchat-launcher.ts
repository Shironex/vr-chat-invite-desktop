/**
 * VRChat Launcher
 * Launches VRChat executable
 */

import { spawn } from "child_process";
import * as path from "path";
import { debugLog } from "../debug-mode";
import { SettingsService } from "./settings.service";

/**
 * Launch VRChat
 * Returns true if launched successfully, false otherwise
 */
export async function launchVRChat(): Promise<boolean> {
  const exePath = SettingsService.getVRChatPath();

  if (!exePath) {
    debugLog.error("Cannot launch: VRChat not found. Please set path in settings.");
    return false;
  }

  try {
    debugLog.info(`Launching VRChat: ${exePath}`);

    // Spawn detached process
    const child = spawn(exePath, [], {
      detached: true,
      stdio: "ignore",
      cwd: path.dirname(exePath),
    });

    // Unref to allow the parent process to exit independently
    child.unref();

    debugLog.success("VRChat launch initiated");
    return true;
  } catch (error) {
    debugLog.error(`Failed to launch VRChat: ${error}`);
    return false;
  }
}

/**
 * Check if VRChat is installed
 */
export function isVRChatInstalled(): boolean {
  return SettingsService.getVRChatPath() !== null;
}
