/**
 * A business-rule failure whose message is safe to show to the user
 * (UI copy, in Spanish). Anything else is an unexpected error.
 */
export class TradeError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TradeError";
  }
}
