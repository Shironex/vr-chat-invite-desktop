/**
 * VRChat API Type Definitions
 * Adapted from P:\Blokersi\apps\bot\src\modules\vrchat\interfaces\vrchat-types.interface.ts
 */

/**
 * VRChat User (simplified)
 */
export interface VRChatUser {
  id: string;
  displayName: string;
  username?: string;
  bio?: string;
  currentAvatarImageUrl?: string;
  currentAvatarThumbnailImageUrl?: string;
  userIcon?: string;
  profilePicOverride?: string;
  tags?: string[];
  developerType?: string;
  status?: string;
  statusDescription?: string;
}

/**
 * VRChat Current User (authenticated user)
 */
export interface VRChatCurrentUser extends VRChatUser {
  email?: string;
  requiresTwoFactorAuth?: string[];
  emailVerified?: boolean;
  hasBirthday?: boolean;
  friends?: string[];
  onlineFriends?: string[];
}

/**
 * VRChat Group Info
 */
export interface VRChatGroup {
  id: string;
  name: string;
  shortCode: string;
  discriminator: string;
  description: string;
  iconUrl?: string;
  bannerUrl?: string;
  privacy: "default" | "private" | "public";
  ownerId: string;
  memberCount: number;
  onlineMemberCount?: number;
  membershipStatus?: string;
  isSearchable?: boolean;
  joinState?: string;
  tags?: string[];
  galleries?: unknown[];
  roles?: unknown[];
  createdAt: string;
  updatedAt?: string;
  lastPostCreatedAt?: string;
}

/**
 * VRChat API Error Response
 */
export interface VRChatAPIError {
  error: {
    message: string;
    status_code: number;
  };
}

/**
 * Session State (stored encrypted with electron-store)
 */
export interface VRChatSession {
  authCookie: string;
  twoFactorAuthCookie?: string;
  userId: string;
  displayName: string;
  avatarUrl?: string;
  expiresAt: number; // timestamp
}

/**
 * Authentication state for the renderer
 */
export interface VRChatAuthState {
  isAuthenticated: boolean;
  userId?: string;
  displayName?: string;
  avatarUrl?: string;
  requiresTwoFactor?: boolean;
  twoFactorMethods?: string[];
}

/**
 * Login credentials
 */
export interface VRChatLoginCredentials {
  username: string;
  password: string;
}

/**
 * 2FA verification request
 */
export interface VRChatTwoFactorRequest {
  method: "totp" | "emailotp" | "otp";
  code: string;
}

/**
 * Invite request for the queue
 */
export interface InviteRequest {
  userId: string;
  displayName: string;
  timestamp: number;
}

/**
 * Invite result types
 */
export type InviteResult = "success" | "skipped" | "error";

/**
 * Invite result with details
 */
export interface InviteResultData {
  result: InviteResult;
  userId: string;
  displayName: string;
  message: string;
  timestamp: number;
}

/**
 * Inviter statistics
 */
export interface InviterStats {
  totalProcessed: number;
  successful: number;
  skipped: number;
  errors: number;
  queueSize: number;
}

/**
 * Log entry for the inviter
 */
export type InviterLogType =
  | "detect"
  | "invite"
  | "skip"
  | "error"
  | "auth"
  | "rate"
  | "queue"
  | "system";

export interface InviterLogEntry {
  type: InviterLogType;
  message: string;
  timestamp: number;
  userId?: string;
  displayName?: string;
  // Translation support - if provided, renderer will translate
  i18nKey?: string;
  i18nParams?: Record<string, string | number>;
}

/**
 * Monitor status
 */
export interface MonitorStatus {
  isRunning: boolean;
  logFilePath?: string;
  lastActivity?: number;
}

/**
 * Rate limit settings (user configurable)
 */
export interface RateLimitSettings {
  inviteBatchCount: number; // Default: 8
  inviteBatchDelay: number; // Default: 12s
  inviteDelayBetween: number; // Default: 2s
  queueThreshold: number; // Default: 88
  queuePauseDelay: number; // Default: 600s
}

/**
 * Group invite API response
 */
export interface GroupInviteResponse {
  userId: string;
  groupId: string;
  membershipStatus?: string;
}

/**
 * Detected player from log file
 */
export interface DetectedPlayer {
  userId: string;
  displayName: string;
  timestamp: number;
}

// ─────────────────────────────────────────────────────────────────
// Invite History Types
// ─────────────────────────────────────────────────────────────────

/**
 * History entry with unique ID
 */
export interface InviteHistoryEntry extends InviteResultData {
  id: string;
}

/**
 * Query options for fetching history
 */
export interface InviteHistoryQueryOptions {
  limit?: number;
  offset?: number;
  search?: string;
  status?: InviteResult;
}

/**
 * Paginated history response
 */
export interface InviteHistoryResponse {
  entries: InviteHistoryEntry[];
  total: number;
  hasMore: boolean;
}

/**
 * Aggregated history statistics
 */
export interface InviteHistoryStats {
  total: number;
  successful: number;
  skipped: number;
  errors: number;
  lastInviteAt?: number;
}

/**
 * CSV export result
 */
export interface InviteHistoryExportResult {
  success: boolean;
  path?: string;
  error?: string;
}

// ─────────────────────────────────────────────────────────────────
// Tray Settings Types
// ─────────────────────────────────────────────────────────────────

/**
 * System tray settings (user configurable)
 */
export interface TraySettings {
  minimizeToTray: boolean; // Default: true
  showDesktopNotifications: boolean; // Default: true
}
