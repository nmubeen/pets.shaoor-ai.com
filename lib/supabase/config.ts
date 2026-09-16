export function getSupabaseConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = (process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)?.trim();
  if (!url || !key) {
    throw new Error("Authentication is not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY in your environment, then restart the app.");
  }
  if (key.startsWith("sb_secret_")) throw new Error("Authentication requires a public publishable key, never a secret key.");
  if (key.split(".").length === 3) {
    try {
      const payload = JSON.parse(atob(key.split(".")[1].replace(/-/g, "+").replace(/_/g, "/")));
      if (payload.role !== "anon") throw new Error("not anon");
    } catch { throw new Error("Authentication requires a publishable key or a legacy anon key, never a service-role key."); }
  }
  return { url, key };
}

export function getOtpLength() {
  const length = Number(process.env.NEXT_PUBLIC_SUPABASE_OTP_LENGTH || "6");
  if (!Number.isInteger(length) || length < 6 || length > 10) {
    throw new Error("Set NEXT_PUBLIC_SUPABASE_OTP_LENGTH to your provider's OTP length (6–10).");
  }
  return length;
}
