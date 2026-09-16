// Shared identity key and Shaoor-AI Pets branding. The email hook uses the canonical host.
export const authAppConfig = {
  key: "pets",
  name: "Shaoor-AI Pets",
  siteUrl: (process.env.NEXT_PUBLIC_SITE_URL || "https://pets.shaoor-ai.com").replace(/\/$/, ""),
};

export function getAuthEmailRedirectTo() {
  const site = new URL(authAppConfig.siteUrl);
  // Local testing must still select Pets branding in the shared email hook.
  // Supabase's shared redirect allowlist accepts this exact path. /login
  // falls back to the Launcher Site URL and produces Launcher-branded mail.
  if (site.hostname === "localhost" || site.hostname === "127.0.0.1") return "https://pets.shaoor-ai.com/auth/sign-in";
  if (site.protocol !== "https:" || site.hostname !== "pets.shaoor-ai.com") throw new Error("Invalid Pets auth site URL");
  return new URL("/auth/sign-in", site.origin).href;
}
