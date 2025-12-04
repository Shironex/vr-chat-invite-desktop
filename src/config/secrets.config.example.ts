/**
 * Secrets Configuration - EXAMPLE FILE
 *
 * Copy this file to secrets.config.ts and replace with your own key.
 *
 * Generate a key using:
 *   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
 *
 * IMPORTANT: Never commit secrets.config.ts to version control!
 */

export const ENCRYPTION_KEY = "REPLACE_WITH_YOUR_64_CHAR_HEX_KEY";
