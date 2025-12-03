import { debugLog } from "./debug-mode";

/**
 * Environment variable schema
 * Define all required and optional environment variables here
 */
interface EnvironmentVariables {
  NODE_ENV?: string;
  VITE_DEV_SERVER_URL?: string;
}

/**
 * Validates environment variables at startup
 * Logs warnings for missing optional variables
 * Logs debug info for all environment variables
 */
export function validateEnvironment(): EnvironmentVariables {
  debugLog.info("Validating environment variables...");

  const env: EnvironmentVariables = {
    NODE_ENV: process.env.NODE_ENV,
    VITE_DEV_SERVER_URL: process.env.VITE_DEV_SERVER_URL,
  };

  // Log environment mode
  const isDevelopment = env.NODE_ENV === "development";
  const isProduction = env.NODE_ENV === "production";

  debugLog.info(`Environment: ${env.NODE_ENV || "not set"}`);
  debugLog.debug(`Is Development: ${isDevelopment}`);
  debugLog.debug(`Is Production: ${isProduction}`);

  // Validate dev server URL in development
  if (isDevelopment && !env.VITE_DEV_SERVER_URL) {
    debugLog.warn(
      "VITE_DEV_SERVER_URL is not set in development mode. App may fail to load."
    );
  }

  // Validate dev server URL format if provided
  if (env.VITE_DEV_SERVER_URL) {
    try {
      const url = new URL(env.VITE_DEV_SERVER_URL);
      debugLog.debug(`Dev server URL: ${url.toString()}`);

      // Warn if not localhost in development
      if (isDevelopment && url.hostname !== "localhost" && url.hostname !== "127.0.0.1") {
        debugLog.warn(
          `Dev server URL is not localhost: ${url.hostname}. This may cause issues.`
        );
      }
    } catch (error) {
      debugLog.error(`Invalid VITE_DEV_SERVER_URL format: ${env.VITE_DEV_SERVER_URL}`);
      debugLog.error(String(error));
    }
  }

  // Log production validation
  if (isProduction && env.VITE_DEV_SERVER_URL) {
    debugLog.warn(
      "VITE_DEV_SERVER_URL is set in production mode. This should not happen."
    );
  }

  debugLog.success("Environment validation completed");
  return env;
}

/**
 * Gets the dev server URL with validation
 * Returns undefined if not set or invalid
 */
export function getDevServerUrl(): string | undefined {
  const url = process.env.VITE_DEV_SERVER_URL;

  if (!url) {
    return undefined;
  }

  try {
    new URL(url); // Validate URL format
    return url;
  } catch {
    debugLog.error(`Invalid VITE_DEV_SERVER_URL: ${url}`);
    return undefined;
  }
}

/**
 * Checks if running in development mode
 */
export function isDevelopment(): boolean {
  return process.env.NODE_ENV === "development";
}

/**
 * Checks if running in production mode
 */
export function isProduction(): boolean {
  return process.env.NODE_ENV === "production";
}
