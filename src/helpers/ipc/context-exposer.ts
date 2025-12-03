import { exposeThemeContext } from "./theme/theme-context";
import { exposeWindowContext } from "./window/window-context";
import { exposeDebugContext } from "./debug/debug-context";
import { exposeUpdaterContext } from "./updater/updater-context";
import { exposeVRChatContext } from "./vrchat/vrchat-context";
import { exposeTrayContext } from "./tray/tray-context";

export default function exposeContexts() {
  exposeWindowContext();
  exposeThemeContext();
  exposeDebugContext();
  exposeUpdaterContext();
  exposeVRChatContext();
  exposeTrayContext();
}
