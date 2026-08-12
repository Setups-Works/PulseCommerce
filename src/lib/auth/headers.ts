/**
 * Headers Proxy uses to hand a verified caller to a route handler.
 *
 * Kept in their own module because both sides need the names and neither
 * should import the other: Proxy pulls in the whole request pipeline, and a
 * route importing that would be a cycle.
 *
 * These are only trustworthy because Proxy deletes any inbound copy before
 * setting its own. Nothing else may set them.
 */
export const USER_ID_HEADER = "x-pulse-user-id";
export const USER_EMAIL_HEADER = "x-pulse-user-email";
