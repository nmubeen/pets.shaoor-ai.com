"use client";

import { useState } from "react";

async function goTo(url: string, body: object) {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (data.url) window.location.href = data.url;
  else alert(data.error ?? "Something went wrong.");
}

export function UpgradeButton({
  tenantId,
  planCode,
  className,
  children,
}: {
  tenantId: string;
  planCode: string;
  className: string;
  children: React.ReactNode;
}) {
  const [loading, setLoading] = useState(false);
  return (
    <button
      disabled={loading}
      onClick={async () => {
        setLoading(true);
        await goTo("/api/stripe/checkout", { tenantId, planCode, interval: "monthly" });
        setLoading(false);
      }}
      className={className}
    >
      {loading ? "Redirecting…" : children}
    </button>
  );
}

export function ManageInPortalButton({ tenantId, className }: { tenantId: string; className: string }) {
  const [loading, setLoading] = useState(false);
  return (
    <button
      disabled={loading}
      onClick={async () => {
        setLoading(true);
        await goTo("/api/stripe/portal", { tenantId });
        setLoading(false);
      }}
      className={className}
    >
      {loading ? "Redirecting…" : "Manage in Stripe portal →"}
    </button>
  );
}
