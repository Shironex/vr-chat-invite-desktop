import { session } from "electron";
import { debugLog } from "../debug-mode";

/**
 * Content Security Policy Configuration
 *
 * This CSP policy is designed for Electron apps with:
 * - Local file loading (file://)
 * - Vite dev server in development (http://localhost)
 * - Inline styles from shadcn-ui/Tailwind
 * - No external scripts or resources
 */
const CSP_POLICY = {
  // Default source: only allow local resources
  "default-src": ["'self'"],

  // Scripts: allow self and inline scripts (needed for Vite HMR in dev)
  "script-src": [
    "'self'",
    "'unsafe-inline'", // Required for Vite dev server HMR
  ],

  // Styles: allow self and inline styles (needed for Tailwind/shadcn-ui)
  "style-src": [
    "'self'",
    "'unsafe-inline'", // Required for Tailwind CSS and dynamic styles
  ],

  // Images: allow self, data URIs, and localhost (for dev server)
  "img-src": [
    "'self'",
    "data:",
    "http://localhost:*", // Vite dev server
  ],

  // Fonts: allow self and data URIs
  "font-src": [
    "'self'",
    "data:",
  ],

  // Connect: allow self, localhost (for Vite HMR), and GitHub API (for changelog)
  "connect-src": [
    "'self'",
    "ws://localhost:*", // Vite HMR WebSocket
    "http://localhost:*", // Vite dev server
    "https://api.github.com", // GitHub API for changelog/releases
  ],

  // Media: only allow self
  "media-src": ["'self'"],

  // Objects: disallow plugins
  "object-src": ["'none'"],

  // Forms: only allow posting to self
  "form-action": ["'self'"],

  // Frames: disallow framing
  "frame-ancestors": ["'none'"],

  // Base URI: restrict base tag
  "base-uri": ["'self'"],
};

/**
 * Builds CSP header string from policy object
 */
function buildCSPHeader(): string {
  return Object.entries(CSP_POLICY)
    .map(([key, values]) => `${key} ${values.join(" ")}`)
    .join("; ");
}

/**
 * Applies Content Security Policy to the Electron app
 * Adds CSP headers to all responses
 */
export function applyContentSecurityPolicy(_isDevelopment: boolean): void {
  const cspHeader = buildCSPHeader();

  debugLog.info("Applying Content Security Policy...");
  debugLog.debug(`CSP Header: ${cspHeader}`);

  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        "Content-Security-Policy": [cspHeader],
      },
    });
  });

  debugLog.success("Content Security Policy applied successfully");
}

/**
 * Prevents navigation to external URLs
 * This is an additional security measure to prevent the renderer from
 * navigating to potentially malicious external sites
 */
export function preventExternalNavigation(): void {
  debugLog.info("Setting up navigation prevention...");

  session.defaultSession.webRequest.onBeforeRequest(
    { urls: ["*://*/*"] },
    (details, callback) => {
      const url = new URL(details.url);

      // Allow localhost for development
      if (url.hostname === "localhost" || url.hostname === "127.0.0.1") {
        callback({});
        return;
      }

      // Allow GitHub API for changelog/releases
      if (url.hostname === "api.github.com") {
        callback({});
        return;
      }

      // Allow file:// protocol for local resources
      if (url.protocol === "file:") {
        callback({});
        return;
      }

      // Block all other external navigation
      debugLog.warn(`Blocked external navigation to: ${details.url}`);
      callback({ cancel: true });
    }
  );

  debugLog.success("Navigation prevention enabled");
}
