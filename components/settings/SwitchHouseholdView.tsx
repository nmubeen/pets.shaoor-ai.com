"use client";

import { useState, useTransition } from "react";
import { Card } from "@/components/ui";
import { declineHouseholdInvite, switchToInvitedHousehold } from "@/lib/actions/tenant";

const field = "bg-paper border border-line rounded-lg px-3.5 py-2.5 text-sm outline-none focus:border-primary transition";
const label = "text-[.68rem] uppercase tracking-[.05em] text-muted";

/**
 * Shown when someone who already owns a household signs in via an invite
 * to a different one — the app only ever supports belonging to exactly
 * one household (owned or joined), so this is where that's actually
 * decided, not silently resolved either way. "Switch" is irreversible:
 * every pet/visit/order/photo in the current household, and its
 * subscription, are gone the moment it's confirmed (see
 * switchToInvitedHousehold in lib/actions/tenant.ts).
 */
export function SwitchHouseholdView({
  inviteId,
  currentHouseholdName,
  invitedHouseholdName,
}: {
  inviteId: string;
  currentHouseholdName: string;
  invitedHouseholdName: string;
}) {
  const [showConfirm, setShowConfirm] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [declinePending, startDeclineTransition] = useTransition();

  const nameMatches = confirmText.trim() === currentHouseholdName;

  function keepCurrent() {
    startDeclineTransition(async () => {
      const result = await declineHouseholdInvite(inviteId);
      if (result?.error) {
        setError(result.error);
        return;
      }
      window.location.replace("/app");
    });
  }

  function confirmSwitch() {
    if (!nameMatches) return;
    setError(null);
    startTransition(async () => {
      const result = await switchToInvitedHousehold(inviteId, confirmText.trim());
      if (result?.error) {
        setError(result.error);
        return;
      }
      // Hard navigation, not router.push — the whole session/tenant
      // context just changed underneath this page, so nothing here
      // should be trusted to still be valid.
      window.location.replace("/app");
    });
  }

  return (
    <div className="flex flex-col gap-6 max-w-xl">
      <div>
        <h1 className="text-2xl mb-1 text-(--color-primary-text)">You&rsquo;ve been invited to another household</h1>
        <p className="text-sm text-muted">
          You already belong to <strong className="text-ink">{currentHouseholdName}</strong>. Shaoor-AI Pets only
          supports being part of one household at a time, so joining <strong className="text-ink">{invitedHouseholdName}</strong> means
          leaving this one behind.
        </p>
      </div>

      {!showConfirm ? (
        <div className="flex flex-col sm:flex-row gap-3">
          <Card className="p-5 flex-1 flex flex-col gap-2">
            <div className="font-semibold text-sm">Keep {currentHouseholdName}</div>
            <p className="text-xs text-muted flex-1">
              Stay where you are. The invite to {invitedHouseholdName} is declined and nothing changes.
            </p>
            <button
              onClick={keepCurrent}
              disabled={declinePending}
              className="inline-flex items-center justify-center gap-2 text-sm font-semibold border border-line rounded-lg px-4 py-2.5 hover:bg-surface-2 transition disabled:opacity-60"
            >
              {declinePending ? "…" : `Keep ${currentHouseholdName}`}
            </button>
          </Card>

          <Card className="p-5 flex-1 flex flex-col gap-2">
            <div className="font-semibold text-sm">Switch to {invitedHouseholdName}</div>
            <p className="text-xs text-muted flex-1">
              Every pet, visit, order, and photo in {currentHouseholdName} — and its subscription — is permanently
              deleted. This can&rsquo;t be undone.
            </p>
            <button
              onClick={() => setShowConfirm(true)}
              className="inline-flex items-center justify-center gap-2 text-sm font-semibold border border-coral text-coral rounded-lg px-4 py-2.5 hover:bg-coral/10 transition"
            >
              Switch to {invitedHouseholdName}…
            </button>
          </Card>
        </div>
      ) : (
        <Card className="p-5 border-coral/40 flex flex-col gap-3">
          <p className="text-sm text-coral font-semibold">
            This permanently deletes every pet, visit, order, and photo in {currentHouseholdName}, and cancels its
            subscription if it has one. There is no undo.
          </p>
          <label className="flex flex-col gap-1.5">
            <span className={label}>Type &ldquo;{currentHouseholdName}&rdquo; to confirm</span>
            <input
              autoFocus
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              className={field}
              placeholder={currentHouseholdName}
              disabled={pending}
            />
          </label>

          {error && <p className="text-xs text-coral">{error}</p>}

          <div className="flex gap-2 mt-1">
            <button
              onClick={confirmSwitch}
              disabled={!nameMatches || pending}
              className="inline-flex items-center justify-center gap-2 text-sm font-semibold bg-coral text-white px-4 py-2.5 rounded-lg hover:brightness-110 transition disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {pending ? "Switching…" : `Delete ${currentHouseholdName} and switch`}
            </button>
            <button
              type="button"
              onClick={() => {
                setShowConfirm(false);
                setConfirmText("");
                setError(null);
              }}
              disabled={pending}
              className="text-xs text-muted hover:text-ink"
            >
              Cancel
            </button>
          </div>
        </Card>
      )}
    </div>
  );
}
