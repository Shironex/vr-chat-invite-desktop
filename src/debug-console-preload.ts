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

// Listen for log messages from main process and dispatch to window
ipcRenderer.on("debug:log", (_event, data: DebugLogData) => {
  // Dispatch custom event to the window
  window.dispatchEvent(
    new CustomEvent("log", {
      detail: data,
    })
  );

  // If this is a network log, also dispatch a network event
  if (data.level === "network" && data.args && data.args.length > 0) {
    const networkData = data.args[0] as NetworkRequest;
    if (networkData && networkData.id) {
      window.dispatchEvent(
        new CustomEvent("network", {
          detail: networkData,
        })
      );
    }
  }
});
