import type { Message } from "../types";

/**
 * Outcome of one send. `retry`: temporary problem, try again later. `gone`: the
 * member blocked or unlinked us (the destination is removed). `failed`:
 * permanent error, do not retry.
 */
export type SendResult = "sent" | "retry" | "gone" | "failed";

export type SendOutcome = {
  result: SendResult;
  /** Stored in the delivery for debugging. */
  error?: string;
};

/**
 * A way to deliver messages. Adding a channel means implementing this and
 * registering it in ./index.ts; rules and messages stay untouched.
 */
export interface NotificationChannel {
  /** Stored in the database, so keep it stable ("telegram", "console"…). */
  readonly id: string;
  /** Its configuration (env vars) is present. */
  isConfigured(): boolean;
  /**
   * When true, every member gets this channel without linking it, with their
   * user id as address (used by the console channel in development).
   */
  readonly implicit?: boolean;
  send(address: string, message: Message, options: { silent: boolean }): Promise<SendOutcome>;
  /** URL that starts linking this channel with a one-time token. */
  linkUrl?(token: string): string;
}
