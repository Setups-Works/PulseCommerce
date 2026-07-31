/**
 * Raised when no WooCommerce store has been authorized yet.
 *
 * There is no demo fallback: the app analyses a real store or it tells you to
 * connect one. Carrying a synthetic dataset alongside real analytics invites
 * the worst possible bug, which is a merchant acting on numbers that were never
 * theirs.
 */
export class NotConnectedError extends Error {
  readonly code = "not_connected";

  constructor(message = "No WooCommerce store is connected yet.") {
    super(message);
    this.name = "NotConnectedError";
  }
}

export function isNotConnected(error: unknown): error is NotConnectedError {
  return error instanceof NotConnectedError;
}
