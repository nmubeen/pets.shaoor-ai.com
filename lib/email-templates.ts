// Shared shell for every email lib/email.ts sends — keeps invite/reminder/
// digest emails visually consistent without a templating framework. Inline
// styles throughout: most email clients strip <style> blocks.
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://pets.shaoor-ai.com";

export function emailShell(preheader: string, bodyHtml: string): string {
  return `
<div style="background:#F3F4EC; padding:32px 16px; font-family:-apple-system,'Segoe UI',sans-serif;">
  <div style="max-width:480px; margin:0 auto; background:#FFFFFF; border:1px solid #D9DCCC; border-radius:12px; overflow:hidden;">
    <div style="background:#1F4B3F; color:#F3F4EC; padding:20px 24px; font-weight:700; font-size:16px;">
      🐾 Menagerie
    </div>
    <div style="padding:24px; color:#1E332B; font-size:14px; line-height:1.6;">
      ${bodyHtml}
    </div>
    <div style="padding:16px 24px; border-top:1px solid #D9DCCC; color:#5B6459; font-size:12px;">
      <a href="${SITE_URL}" style="color:#5B6459;">pets.shaoor-ai.com</a>
    </div>
  </div>
  <div style="display:none; max-height:0; overflow:hidden;">${preheader}</div>
</div>`;
}

export function emailButton(href: string, label: string): string {
  return `<a href="${href}" style="display:inline-block; background:#DB8F2C; color:#20180A; font-weight:600; text-decoration:none; padding:10px 20px; border-radius:8px; font-size:14px; margin-top:8px;">${label}</a>`;
}
