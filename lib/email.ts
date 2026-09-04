// Thin wrapper around Zeptomail's send-email API — used for every email
// *our own code* sends (team invites, digests). Supabase Auth's own emails
// (confirmation, password reset) are separate: they go through Supabase's
// SMTP relay, configured in the dashboard with Zeptomail's SMTP
// credentials, not this file.
import "server-only";

// .in, not .com — matches the zeptomail.in data center used when the
// domain was verified (see the bounce-zem CNAME pointing at
// cluster89.zeptomail.in).
const ZEPTOMAIL_API_URL = "https://api.zeptomail.in/v1.1/email";

const FROM_ADDRESS = process.env.EMAIL_FROM_ADDRESS || "noreply@pets.shaoor-ai.com";
const FROM_NAME = process.env.EMAIL_FROM_NAME || "Menagerie";

export async function sendEmail({
  to,
  toName,
  subject,
  html,
}: {
  to: string;
  toName?: string;
  subject: string;
  html: string;
}): Promise<{ error: string | null }> {
  if (!process.env.ZEPTOMAIL_API_TOKEN) {
    // Soft-fail rather than throw: the thing that triggered this email
    // (an invite, a digest run) should still succeed even if email isn't
    // configured yet — same reasoning as lib/razorpay.ts's lazy client,
    // just applied to a fire-and-forget side effect instead of a request
    // that can return an error to the user.
    console.error(`ZEPTOMAIL_API_TOKEN not set — email "${subject}" to ${to} not sent.`);
    return { error: "Email is not configured yet." };
  }

  try {
    const res = await fetch(ZEPTOMAIL_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        Authorization: `Zoho-enczapikey ${process.env.ZEPTOMAIL_API_TOKEN}`,
      },
      body: JSON.stringify({
        from: { address: FROM_ADDRESS, name: FROM_NAME },
        to: [{ email_address: { address: to, name: toName || to } }],
        subject,
        htmlbody: html,
      }),
    });

    if (!res.ok) {
      const body = await res.text();
      console.error(`Zeptomail error ${res.status} sending "${subject}" to ${to}:`, body);
      return { error: `Email failed to send (${res.status}).` };
    }
    return { error: null };
  } catch (err) {
    console.error(`Zeptomail request failed sending "${subject}" to ${to}:`, err);
    return { error: (err as Error).message };
  }
}
