/**
 * VRChat API Service
 * Handles API calls for group operations
 */

import { net } from "electron";
import { debugLog } from "../debug-mode";
import { VRCHAT_API, VRCHAT_GROUP } from "../../config/vrchat.config";
import { VRChatAuthService } from "./vrchat-auth.service";
import type { VRChatGroup, GroupInviteResponse } from "./vrchat-types";

/**
 * VRChat API Service Singleton
 */
class VRChatApiServiceClass {
  /**
   * Make authenticated HTTP request to VRChat API
   */
  private async makeRequest<T>(
    method: "GET" | "POST" | "DELETE",
    endpoint: string,
    body?: Record<string, unknown>
  ): Promise<{ status: number; data: T }> {
    return new Promise((resolve, reject) => {
      const url = `${VRCHAT_API.BASE_URL}${endpoint}`;
      debugLog.network(`${method} ${url}`);

      const request = net.request({
        method,
        url,
      });

      // Set headers
      const authHeaders = VRChatAuthService.getAuthHeaders();
      for (const [key, value] of Object.entries(authHeaders)) {
        request.setHeader(key, value);
      }
      request.setHeader("Content-Type", "application/json");

      let responseData = "";
      let responseStatus = 0;

      request.on("response", (response) => {
        responseStatus = response.statusCode;

        response.on("data", (chunk) => {
          responseData += chunk.toString();
        });

        response.on("end", () => {
          try {
            const data = JSON.parse(responseData) as T;
            resolve({ status: responseStatus, data });
          } catch {
            resolve({ status: responseStatus, data: responseData as T });
          }
        });
      });

      request.on("error", (error) => {
        debugLog.error(`Request error: ${error.message}`);
        reject(error);
      });

      if (body && (method === "POST" || method === "DELETE")) {
        request.write(JSON.stringify(body));
      }

      request.end();
    });
  }

  /**
   * Get group information
   */
  async getGroupInfo(groupId?: string): Promise<VRChatGroup | null> {
    const id = groupId || VRCHAT_GROUP.GROUP_ID;
    debugLog.info(`Getting group info for: ${id}`);

    try {
      const response = await this.makeRequest<VRChatGroup>("GET", `/groups/${id}`);

      if (response.status === 200) {
        debugLog.success(`Got group info: ${response.data.name}`);
        return response.data;
      }

      if (response.status === 404) {
        debugLog.error("Group not found");
        return null;
      }

      debugLog.error(`Failed to get group info: HTTP ${response.status}`);
      return null;
    } catch (error) {
      debugLog.error(`Failed to get group info: ${error}`);
      return null;
    }
  }

  /**
   * Send group invite to a user
   */
  async sendGroupInvite(
    userId: string,
    groupId?: string
  ): Promise<{ success: boolean; message: string; skipped?: boolean }> {
    const id = groupId || VRCHAT_GROUP.GROUP_ID;
    debugLog.info(`Sending group invite to ${userId}`);

    try {
      const response = await this.makeRequest<GroupInviteResponse | { error?: { message: string } }>(
        "POST",
        `/groups/${id}/invites`,
        { userId }
      );

      // Success
      if (response.status === 200 || response.status === 201) {
        debugLog.success(`Invited ${userId} to group`);
        return { success: true, message: "Invite sent successfully" };
      }

      // Handle specific error cases
      const errorData = response.data as { error?: { message: string } };
      const errorMessage = errorData?.error?.message || `HTTP ${response.status}`;

      // Already invited or member
      if (
        response.status === 400 &&
        (errorMessage.toLowerCase().includes("already invited") ||
          errorMessage.toLowerCase().includes("already a member") ||
          errorMessage.toLowerCase().includes("already in group"))
      ) {
        debugLog.info(`User ${userId} already invited/member`);
        return { success: false, message: "Already invited or member", skipped: true };
      }

      // User not found
      if (response.status === 404) {
        debugLog.warn(`User ${userId} not found`);
        return { success: false, message: "User not found", skipped: true };
      }

      // Rate limited
      if (response.status === 429) {
        debugLog.warn("Rate limited by VRChat API");
        return { success: false, message: "Rate limited" };
      }

      // Unauthorized
      if (response.status === 401 || response.status === 403) {
        debugLog.error("Unauthorized - session may have expired");
        return { success: false, message: "Session expired" };
      }

      // Other error
      debugLog.error(`Failed to invite ${userId}: ${errorMessage}`);
      return { success: false, message: errorMessage };
    } catch (error) {
      debugLog.error(`Failed to send invite: ${error}`);
      return { success: false, message: String(error) };
    }
  }

  /**
   * Get user by ID
   */
  async getUser(userId: string): Promise<{ id: string; displayName: string } | null> {
    debugLog.info(`Getting user info for: ${userId}`);

    try {
      const response = await this.makeRequest<{ id: string; displayName: string }>(
        "GET",
        `/users/${userId}`
      );

      if (response.status === 200) {
        return response.data;
      }

      return null;
    } catch (error) {
      debugLog.error(`Failed to get user: ${error}`);
      return null;
    }
  }

  /**
   * Check if user is already a group member
   */
  async isGroupMember(userId: string, groupId?: string): Promise<boolean> {
    const id = groupId || VRCHAT_GROUP.GROUP_ID;

    try {
      const response = await this.makeRequest<{ userId?: string }>(
        "GET",
        `/groups/${id}/members/${userId}`
      );

      return response.status === 200;
    } catch {
      return false;
    }
  }
}

// Export singleton instance
export const VRChatApiService = new VRChatApiServiceClass();
