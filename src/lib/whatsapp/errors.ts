/**
 * Raised when no WhatsApp gateway has been configured yet.
 *
 * Typed rather than a bare Error so the routes that go through the audience
 * resolver can answer 409 like every other WhatsApp route does. Left untyped it
 * fell through to the generic handler and became a 500 — a server fault for
 * what is really a setup step the operator has not done.
 */
export class GatewayNotConnectedError extends Error {
  readonly code = "gateway_not_connected";

  constructor(message = "No WhatsApp gateway is connected. Add one in Settings first.") {
    super(message);
    this.name = "GatewayNotConnectedError";
  }
}

export function isGatewayNotConnected(error: unknown): error is GatewayNotConnectedError {
  return error instanceof GatewayNotConnectedError;
}

/**
 * No WooCommerce store is connected, so there is no audience to resolve.
 *
 * Distinct from the gateway not being connected: one means "we cannot send",
 * the other means "there is nobody to send to". They are fixed on different
 * settings screens, so telling them apart is what makes the message useful.
 */
export class NoStoreError extends Error {
  readonly code = "not_connected";
  constructor() {
    super("No WooCommerce store is connected, so there is no audience to resolve.");
    this.name = "NoStoreError";
  }
}
