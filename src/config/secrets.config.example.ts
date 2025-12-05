/**
 * Secrets Configuration - EXAMPLE FILE
 *
 * Copy this file to secrets.config.ts and replace with your own values.
 *
 * Generate an encryption key using:
 *   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
 *
 * IMPORTANT: Never commit secrets.config.ts to version control!
 */

export const ENCRYPTION_KEY = "REPLACE_WITH_YOUR_64_CHAR_HEX_KEY";

/**
 * Debug Webhook URL - Used for sending debug reports when users report issues.
 * This webhook is hardcoded in the app build and receives debug logs
 * when users click the "Send Debug Report" button.
 *
 * Set this to your Discord webhook URL for receiving debug reports.
 * Leave empty string "" to disable the debug report feature.
 */
export const DEBUG_WEBHOOK_URL: string = "";
