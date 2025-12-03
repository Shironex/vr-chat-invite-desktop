/**
 * Network Interceptor
 *
 * Intercepts fetch requests and sends them to the debug console.
 * This wraps the global fetch function to capture all network activity.
 */

interface NetworkRequest {
  id: string;
  method: string;
  url: string;
  status: "pending" | "success" | "error";
  statusCode?: number;
  timing: number;
  size: number;
  startTime: number;
  error?: string;
}

// Store for pending requests
const pendingRequests = new Map<string, NetworkRequest>();

// Generate unique request ID
let requestCounter = 0;
function generateRequestId(): string {
  return `req_${Date.now()}_${++requestCounter}`;
}

/**
 * Send network request to debug console via IPC
 */
function sendNetworkEvent(request: NetworkRequest): void {
  if (window.debugAPI) {
    // Log to network category
    const statusEmoji = request.status === "success" ? "✅" : request.status === "error" ? "❌" : "⏳";
    const message = `${statusEmoji} ${request.method} ${request.url} ${request.statusCode ? `[${request.statusCode}]` : ""} ${request.timing}ms`;
    window.debugAPI.network(message, {
      id: request.id,
      method: request.method,
      url: request.url,
      status: request.status,
      statusCode: request.statusCode,
      timing: request.timing,
      size: request.size,
      error: request.error,
    });
  }

  // Also dispatch a custom event for the debug console's network tab
  window.dispatchEvent(
    new CustomEvent("debug:network", {
      detail: request,
    })
  );
}

/**
 * Install the network interceptor
 * Call this once during app initialization
 */
export function installNetworkInterceptor(): void {
  // Only install if not already installed
  if ((window as unknown as { __networkInterceptorInstalled?: boolean }).__networkInterceptorInstalled) {
    return;
  }

  const originalFetch = window.fetch;

  window.fetch = async function (
    input: RequestInfo | URL,
    init?: RequestInit
  ): Promise<Response> {
    const requestId = generateRequestId();
    const startTime = performance.now();

    // Extract URL and method
    let url: string;
    let method: string;

    if (typeof input === "string") {
      url = input;
      method = init?.method || "GET";
    } else if (input instanceof URL) {
      url = input.toString();
      method = init?.method || "GET";
    } else if (input instanceof Request) {
      url = input.url;
      method = input.method;
    } else {
      url = String(input);
      method = init?.method || "GET";
    }

    // Create pending request
    const request: NetworkRequest = {
      id: requestId,
      method: method.toUpperCase(),
      url,
      status: "pending",
      timing: 0,
      size: 0,
      startTime,
    };

    pendingRequests.set(requestId, request);
    sendNetworkEvent(request);

    try {
      const response = await originalFetch.call(window, input, init);
      const endTime = performance.now();

      // Clone response to read body for size
      const clonedResponse = response.clone();
      let size = 0;

      try {
        const blob = await clonedResponse.blob();
        size = blob.size;
      } catch {
        // Size calculation failed, use content-length header
        const contentLength = response.headers.get("content-length");
        if (contentLength) {
          size = parseInt(contentLength, 10);
        }
      }

      // Update request with response info
      request.status = response.ok ? "success" : "error";
      request.statusCode = response.status;
      request.timing = Math.round(endTime - startTime);
      request.size = size;

      pendingRequests.delete(requestId);
      sendNetworkEvent(request);

      return response;
    } catch (error) {
      const endTime = performance.now();

      // Update request with error info
      request.status = "error";
      request.timing = Math.round(endTime - startTime);
      request.error = error instanceof Error ? error.message : "Unknown error";

      pendingRequests.delete(requestId);
      sendNetworkEvent(request);

      throw error;
    }
  };

  (window as unknown as { __networkInterceptorInstalled: boolean }).__networkInterceptorInstalled = true;

  console.log("[Network Interceptor] Installed");
}

/**
 * Get all pending requests
 */
export function getPendingRequests(): NetworkRequest[] {
  return Array.from(pendingRequests.values());
}
