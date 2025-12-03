/**
 * Type-safe IPC Schema
 *
 * This file defines all IPC channels with their request and response types.
 * This provides compile-time type safety for IPC communications.
 */

import type { ThemeMode } from "@/types/theme-mode";

/**
 * IPC Schema Definition
 *
 * Format: { channel: { request: RequestType, response: ResponseType } }
 */
export interface IPCSchema {
  // Theme channels
  "theme:toggle": { request: void; response: boolean };
  "theme:dark": { request: void; response: void };
  "theme:light": { request: void; response: void };
  "theme:system": { request: void; response: boolean };
  "theme:current": { request: void; response: ThemeMode };

  // Window channels
  "window:minimize": { request: void; response: void };
  "window:maximize": { request: void; response: void };
  "window:close": { request: void; response: void };

  // Debug channels
  "debug:log": {
    request: {
      level: DebugLogLevel;
      message: string;
      args: unknown[];
    };
    response: void;
  };
}

/**
 * Extract channel names from IPCSchema
 */
export type IPCChannel = keyof IPCSchema;

/**
 * Extract request type for a specific channel
 */
export type IPCRequest<T extends IPCChannel> = IPCSchema[T]["request"];

/**
 * Extract response type for a specific channel
 */
export type IPCResponse<T extends IPCChannel> = IPCSchema[T]["response"];

/**
 * Type-safe IPC invoke helper (for renderer)
 *
 * Usage:
 * ```ts
 * const theme = await typedInvoke("theme:current");
 * ```
 */
export function typedInvoke<T extends IPCChannel>(
  channel: T,
  ...args: IPCRequest<T> extends void ? [] : [IPCRequest<T>]
): Promise<IPCResponse<T>> {
  // @ts-expect-error - window.electronAPI is defined in preload
  return window.electronAPI ? window.electronAPI.invoke(channel, ...args) : Promise.reject("IPC not available");
}

/**
 * Type-safe IPC send helper (for renderer)
 *
 * Usage:
 * ```ts
 * typedSend("debug:log", { level: "info", message: "Hello", args: [] });
 * ```
 */
export function typedSend<T extends IPCChannel>(
  channel: T,
  ...args: IPCRequest<T> extends void ? [] : [IPCRequest<T>]
): void {
  // @ts-expect-error - window.electronAPI is defined in preload
  if (window.electronAPI) {
    window.electronAPI.send(channel, ...args);
  }
}

/**
 * Type-safe IPC invoke with timeout (for renderer)
 *
 * Usage:
 * ```ts
 * const theme = await typedInvokeWithTimeout("theme:current", { timeout: 5000 });
 * ```
 *
 * @throws {Error} When timeout is reached
 */
export function typedInvokeWithTimeout<T extends IPCChannel>(
  channel: T,
  options: {
    timeout?: number; // Timeout in milliseconds (default: 10000)
    args?: IPCRequest<T> extends void ? never : IPCRequest<T>;
  } = {}
): Promise<IPCResponse<T>> {
  const { timeout = 10000, args } = options;

  const invokePromise = typedInvoke(
    channel,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ...(args !== undefined ? [args as any] : [])
  );

  const timeoutPromise = new Promise<never>((_, reject) => {
    setTimeout(() => {
      reject(new Error(`IPC timeout: ${channel} took longer than ${timeout}ms`));
    }, timeout);
  });

  return Promise.race([invokePromise, timeoutPromise]);
}

/**
 * Cancellable IPC request
 *
 * Usage:
 * ```ts
 * const request = cancellableInvoke("theme:current");
 * request.promise.then(theme => console.log(theme));
 *
 * // Cancel if needed
 * request.cancel();
 * ```
 */
export function cancellableInvoke<T extends IPCChannel>(
  channel: T,
  ...args: IPCRequest<T> extends void ? [] : [IPCRequest<T>]
): {
  promise: Promise<IPCResponse<T>>;
  cancel: () => void;
} {
  let cancelled = false;
  let rejectFn: ((reason: Error) => void) | null = null;

  const promise = new Promise<IPCResponse<T>>((resolve, reject) => {
    rejectFn = reject;

    if (cancelled) {
      reject(new Error(`IPC request cancelled: ${channel}`));
      return;
    }

    typedInvoke(channel, ...args)
      .then((result) => {
        if (!cancelled) {
          resolve(result);
        }
      })
      .catch((error) => {
        if (!cancelled) {
          reject(error);
        }
      });
  });

  const cancel = () => {
    cancelled = true;
    if (rejectFn) {
      rejectFn(new Error(`IPC request cancelled: ${channel}`));
    }
  };

  return { promise, cancel };
}
