/**
 * VRChat Authentication Service
 * Handles login, 2FA (TOTP + Email), and session management
 */

import Store from "electron-store";
import { authenticator } from "otplib";
import { net } from "electron";
import { debugLog } from "../debug-mode";
import { VRCHAT_API, SESSION_CONFIG } from "../../config/vrchat.config";
import type {
  VRChatAuthState,
  VRChatLoginCredentials,
  VRChatTwoFactorRequest,
  VRChatSession,
  VRChatCurrentUser,
} from "./vrchat-types";

// Encrypted store for session data
const store = new Store({
  name: "vrchat-session",
  encryptionKey: "vrc-group-inviter-secret-key-v1",
});

/**
 * VRChat Authentication Service Singleton
 */
class VRChatAuthServiceClass {
  private authCookie: string | null = null;
  private twoFactorAuthCookie: string | null = null;
  private userId: string | null = null;
  private displayName: string | null = null;
  private sessionExpiresAt: number | null = null;
  private pendingTwoFactorMethods: string[] = [];
  private validationInterval: ReturnType<typeof setInterval> | null = null;

  constructor() {
    // Try to load existing session on startup
    this.loadSession();
  }

  /**
   * Load session from encrypted store
   */
  private loadSession(): boolean {
    try {
      const session = store.get(SESSION_CONFIG.STORAGE_KEY) as VRChatSession | undefined;

      if (!session || !session.authCookie) {
        debugLog.info("No existing session found");
        return false;
      }

      // Check if session expired
      if (session.expiresAt < Date.now()) {
        debugLog.info("Session expired, clearing");
        this.clearSession();
        return false;
      }

      this.authCookie = session.authCookie;
      this.twoFactorAuthCookie = session.twoFactorAuthCookie || null;
      this.userId = session.userId;
      this.displayName = session.displayName;
      this.sessionExpiresAt = session.expiresAt;

      debugLog.success(`Session loaded for ${this.displayName}`);
      return true;
    } catch (error) {
      debugLog.error(`Failed to load session: ${error}`);
      return false;
    }
  }

  /**
   * Save session to encrypted store
   */
  private saveSession(): void {
    if (!this.authCookie || !this.userId || !this.displayName) {
      return;
    }

    const session: VRChatSession = {
      authCookie: this.authCookie,
      twoFactorAuthCookie: this.twoFactorAuthCookie || undefined,
      userId: this.userId,
      displayName: this.displayName,
      expiresAt: this.sessionExpiresAt || Date.now() + SESSION_CONFIG.SESSION_DURATION,
    };

    store.set(SESSION_CONFIG.STORAGE_KEY, session);
    debugLog.info("Session saved");
  }

  /**
   * Clear session from store and memory
   */
  private clearSession(): void {
    this.authCookie = null;
    this.twoFactorAuthCookie = null;
    this.userId = null;
    this.displayName = null;
    this.sessionExpiresAt = null;
    this.pendingTwoFactorMethods = [];
    store.delete(SESSION_CONFIG.STORAGE_KEY);
    debugLog.info("Session cleared");
  }

  /**
   * Make HTTP request to VRChat API using Electron's net module
   */
  private async makeRequest<T>(
    method: "GET" | "POST",
    endpoint: string,
    body?: Record<string, unknown>,
    authHeader?: string
  ): Promise<{ status: number; data: T; cookies: string[] }> {
    return new Promise((resolve, reject) => {
      const url = `${VRCHAT_API.BASE_URL}${endpoint}`;
      debugLog.network(`${method} ${url}`);

      const request = net.request({
        method,
        url,
      });

      // Set headers
      request.setHeader("User-Agent", VRCHAT_API.USER_AGENT);
      request.setHeader("Content-Type", "application/json");

      // Add auth header if provided (Basic auth for login)
      if (authHeader) {
        request.setHeader("Authorization", authHeader);
      }

      // Add cookies for authenticated requests
      const cookieHeader = this.getCookieHeader();
      if (cookieHeader) {
        request.setHeader("Cookie", cookieHeader);
      }

      let responseData = "";
      let responseStatus = 0;
      const responseCookies: string[] = [];

      request.on("response", (response) => {
        responseStatus = response.statusCode;

        // Extract cookies
        const setCookieHeaders = response.headers["set-cookie"];
        if (setCookieHeaders) {
          if (Array.isArray(setCookieHeaders)) {
            responseCookies.push(...setCookieHeaders);
          } else {
            responseCookies.push(setCookieHeaders);
          }
        }

        response.on("data", (chunk) => {
          responseData += chunk.toString();
        });

        response.on("end", () => {
          try {
            const data = JSON.parse(responseData) as T;
            resolve({ status: responseStatus, data, cookies: responseCookies });
          } catch {
            resolve({ status: responseStatus, data: responseData as T, cookies: responseCookies });
          }
        });
      });

      request.on("error", (error) => {
        debugLog.error(`Request error: ${error.message}`);
        reject(error);
      });

      if (body && method === "POST") {
        request.write(JSON.stringify(body));
      }

      request.end();
    });
  }

  /**
   * Get cookie header string
   */
  private getCookieHeader(): string {
    const parts: string[] = [];

    if (this.authCookie) {
      parts.push(`auth=${this.authCookie}`);
    }

    if (this.twoFactorAuthCookie) {
      parts.push(`twoFactorAuth=${this.twoFactorAuthCookie}`);
    }

    return parts.join("; ");
  }

  /**
   * Extract cookies from response headers
   */
  private extractCookies(cookies: string[]): void {
    for (const cookie of cookies) {
      if (cookie.startsWith("auth=")) {
        this.authCookie = cookie.split(";")[0].replace("auth=", "");
        debugLog.info("Auth cookie received");
      } else if (cookie.startsWith("twoFactorAuth=")) {
        this.twoFactorAuthCookie = cookie.split(";")[0].replace("twoFactorAuth=", "");
        debugLog.info("2FA cookie received");
      }
    }
  }

  /**
   * Login with username and password
   */
  async login(credentials: VRChatLoginCredentials): Promise<VRChatAuthState> {
    debugLog.info(`Attempting login for: ${credentials.username}`);

    try {
      // Create Basic Auth header
      const authHeader = `Basic ${Buffer.from(
        `${credentials.username}:${credentials.password}`
      ).toString("base64")}`;

      const response = await this.makeRequest<VRChatCurrentUser | { requiresTwoFactorAuth?: string[] }>(
        "GET",
        "/auth/user",
        undefined,
        authHeader
      );

      // Extract cookies
      this.extractCookies(response.cookies);

      // Check response status
      if (response.status === 401 || response.status === 403) {
        debugLog.error("Login failed: Invalid credentials");
        return {
          isAuthenticated: false,
          requiresTwoFactor: false,
        };
      }

      if (response.status === 429) {
        debugLog.error("Login failed: Rate limited");
        throw new Error("Rate limited. Please wait before trying again.");
      }

      if (response.status !== 200) {
        debugLog.error(`Login failed: HTTP ${response.status}`);
        throw new Error(`Login failed with status ${response.status}`);
      }

      const userData = response.data;

      // Check if 2FA is required
      if ("requiresTwoFactorAuth" in userData && userData.requiresTwoFactorAuth?.length) {
        this.pendingTwoFactorMethods = userData.requiresTwoFactorAuth;
        debugLog.info(`2FA required: ${userData.requiresTwoFactorAuth.join(", ")}`);

        return {
          isAuthenticated: false,
          requiresTwoFactor: true,
          twoFactorMethods: userData.requiresTwoFactorAuth,
        };
      }

      // Login successful without 2FA
      if ("id" in userData && "displayName" in userData) {
        this.userId = userData.id;
        this.displayName = userData.displayName;
        this.sessionExpiresAt = Date.now() + SESSION_CONFIG.SESSION_DURATION;
        this.saveSession();
        this.startValidationInterval();

        debugLog.success(`Logged in as ${this.displayName}`);

        return {
          isAuthenticated: true,
          userId: this.userId,
          displayName: this.displayName,
        };
      }

      throw new Error("Unexpected response format");
    } catch (error) {
      debugLog.error(`Login error: ${error}`);
      throw error;
    }
  }

  /**
   * Verify 2FA code
   */
  async verify2FA(request: VRChatTwoFactorRequest): Promise<VRChatAuthState> {
    debugLog.info(`Verifying 2FA with method: ${request.method}`);

    try {
      const response = await this.makeRequest<{ verified?: boolean }>(
        "POST",
        `/auth/twofactorauth/${request.method}/verify`,
        { code: request.code }
      );

      // Extract cookies
      this.extractCookies(response.cookies);

      if (response.status !== 200 || !response.data?.verified) {
        debugLog.error("2FA verification failed");
        return {
          isAuthenticated: false,
          requiresTwoFactor: true,
          twoFactorMethods: this.pendingTwoFactorMethods,
        };
      }

      debugLog.success("2FA verified");

      // Get user info after 2FA
      const userResponse = await this.makeRequest<VRChatCurrentUser>("GET", "/auth/user");

      if (userResponse.status === 200 && "id" in userResponse.data) {
        this.userId = userResponse.data.id;
        this.displayName = userResponse.data.displayName;
        this.sessionExpiresAt = Date.now() + SESSION_CONFIG.SESSION_DURATION;
        this.pendingTwoFactorMethods = [];
        this.saveSession();
        this.startValidationInterval();

        debugLog.success(`Logged in as ${this.displayName}`);

        return {
          isAuthenticated: true,
          userId: this.userId,
          displayName: this.displayName,
        };
      }

      throw new Error("Failed to get user info after 2FA");
    } catch (error) {
      debugLog.error(`2FA error: ${error}`);
      throw error;
    }
  }

  /**
   * Generate TOTP code from secret
   */
  generateTOTPCode(secret: string): string {
    const cleanSecret = secret.replace(/\s/g, "").toUpperCase();
    return authenticator.generate(cleanSecret);
  }

  /**
   * Logout and clear session
   */
  async logout(): Promise<void> {
    debugLog.info("Logging out...");
    this.stopValidationInterval();
    this.clearSession();
  }

  /**
   * Get current authentication state
   */
  getAuthState(): VRChatAuthState {
    if (this.pendingTwoFactorMethods.length > 0) {
      return {
        isAuthenticated: false,
        requiresTwoFactor: true,
        twoFactorMethods: this.pendingTwoFactorMethods,
      };
    }

    return {
      isAuthenticated: this.isAuthenticated(),
      userId: this.userId || undefined,
      displayName: this.displayName || undefined,
    };
  }

  /**
   * Validate current session
   */
  async validateSession(): Promise<boolean> {
    if (!this.authCookie) {
      return false;
    }

    try {
      const response = await this.makeRequest<VRChatCurrentUser>("GET", "/auth/user");

      if (response.status === 200 && "id" in response.data) {
        // Update user info in case it changed
        this.userId = response.data.id;
        this.displayName = response.data.displayName;
        debugLog.info(`Session valid for ${this.displayName}`);
        return true;
      }

      debugLog.warn("Session invalid");
      this.clearSession();
      return false;
    } catch (error) {
      debugLog.error(`Session validation error: ${error}`);
      return false;
    }
  }

  /**
   * Check if authenticated
   */
  isAuthenticated(): boolean {
    return (
      this.authCookie !== null &&
      this.userId !== null &&
      (this.sessionExpiresAt === null || this.sessionExpiresAt > Date.now())
    );
  }

  /**
   * Get auth headers for API requests
   */
  getAuthHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      "User-Agent": VRCHAT_API.USER_AGENT,
    };

    const cookieHeader = this.getCookieHeader();
    if (cookieHeader) {
      headers["Cookie"] = cookieHeader;
    }

    return headers;
  }

  /**
   * Get current user ID
   */
  getUserId(): string | null {
    return this.userId;
  }

  /**
   * Get current display name
   */
  getDisplayName(): string | null {
    return this.displayName;
  }

  /**
   * Start periodic session validation
   */
  private startValidationInterval(): void {
    this.stopValidationInterval();

    this.validationInterval = setInterval(async () => {
      const isValid = await this.validateSession();
      if (!isValid) {
        debugLog.warn("Session expired during validation interval");
      }
    }, SESSION_CONFIG.VALIDATION_INTERVAL);

    debugLog.info("Session validation interval started");
  }

  /**
   * Stop periodic session validation
   */
  private stopValidationInterval(): void {
    if (this.validationInterval) {
      clearInterval(this.validationInterval);
      this.validationInterval = null;
      debugLog.info("Session validation interval stopped");
    }
  }
}

// Export singleton instance
export const VRChatAuthService = new VRChatAuthServiceClass();
