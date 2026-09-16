// Safe, non-production-only diagnostic logging for the auth/membership/
// provisioning pipeline — so a live failure can be categorized (RPC error
// vs. missing row vs. inactive vs. suspended vs. tenant-missing vs.
// commercial-denial) without guessing from one generic user-facing
// message. Never pass anything but a fixed category string here: no OTP
// codes, access tokens, emails, or other request data.
export type AuthDiagnosticCategory =
  | "membership_rpc_failed"
  | "membership_missing"
  | "membership_inactive"
  | "membership_suspended"
  | "tenant_missing"
  | "tenant_provisioning_failed"
  | "subscription_missing"
  | "commercial_access_denied";

export function logAuthDiagnostic(category: AuthDiagnosticCategory) {
  if (process.env.NODE_ENV !== "production") {
    console.warn(`[pets-auth] ${category}`);
  }
}
