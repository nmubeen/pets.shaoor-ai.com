// Map provider failures to fixed text; never render/log raw SMTP responses,
// which can include email addresses or other sensitive configuration.
export function otpErrorMessage(error: { code?: string; status?: number; message?: string }, verify: boolean) {
  if (error.status === 429 || error.code === "over_email_send_rate_limit" || error.code === "over_request_rate_limit") {
    return "Too many code requests. Please wait before trying again; the email provider may require longer than 60 seconds.";
  }
  if (error.code === "email_provider_disabled" || error.code === "otp_disabled") {
    return "Email code sign-in is currently disabled. Please contact support.";
  }
  if (error.code === "signup_disabled") return "New account registration is currently disabled. Please contact support.";
  if (error.code === "email_address_invalid") return "Please enter a valid email address.";
  if (error.code === "email_address_not_authorized") return "Email delivery to this address is not enabled. Please contact support.";
  if (error.code === "captcha_failed") return "The sign-in security check failed. Please contact support.";
  if (error.code === "request_timeout" || error.status === 0) return "Unable to connect. Check your connection and try again.";
  // Older Auth versions expose SMTP failure only through this message.
  if (/error sending (confirmation|magic link|otp|email)/i.test(error.message ?? "")) {
    return "The sign-in email could not be delivered. Please contact support to check the email sender configuration.";
  }
  if (error.status && error.status >= 500) return "The sign-in service encountered a server error. Please try again later or contact support.";
  return verify
    ? "That code is invalid or expired. Try again or request a new code."
    : "Unable to send a code. Please wait and try again. If this continues, contact support.";
}
