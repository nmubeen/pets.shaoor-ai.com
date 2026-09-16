"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Card, Badge } from "@/components/ui";
import { PlusIcon, TrashIcon } from "@/components/icons";
import { CareTabs } from "@/components/settings/CareTabs";
import { updateTenantName, inviteHouseholdMember, removeHouseholdMember } from "@/lib/actions/tenant";
import { formatDate } from "@/lib/format";
import type { HouseholdMember } from "@/lib/household";

const field = "bg-paper border border-line rounded-lg px-3.5 py-2.5 text-sm outline-none focus:border-primary transition";
const label = "text-[.68rem] uppercase tracking-[.05em] text-muted";

function HouseholdNameForm({ tenantId, name }: { tenantId: string; name: string }) {
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function handleSubmit(formData: FormData) {
    setError(null);
    setSaved(false);
    startTransition(async () => {
      const result = await updateTenantName(tenantId, formData);
      if (result?.error) {
        setError(result.error);
        return;
      }
      setSaved(true);
      router.refresh();
    });
  }

  return (
    <Card className="p-5 bg-(image:--gradient-form-bg) max-w-md">
      <form action={handleSubmit} className="flex flex-col gap-3">
        <label className="flex flex-col gap-1.5">
          <span className={label}>Household name</span>
          <input name="name" required defaultValue={name} className={field} placeholder="The Smiths' household" />
        </label>

        {error && <p className="text-xs text-coral">{error}</p>}
        {saved && !error && <p className="text-xs text-good">Saved.</p>}

        <div className="flex gap-2 mt-1">
          <button
            type="submit"
            disabled={pending}
            className="inline-flex items-center justify-center gap-2 text-sm font-semibold bg-(image:--gradient-button-bg) text-white px-4 py-2.5 rounded-lg hover:brightness-110 transition disabled:opacity-60"
          >
            {pending ? "Saving…" : "Save"}
          </button>
        </div>
      </form>
    </Card>
  );
}

function InviteForm({ tenantId }: { tenantId: string }) {
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);

  function handleSubmit(formData: FormData) {
    setError(null);
    setSent(false);
    startTransition(async () => {
      const result = await inviteHouseholdMember(tenantId, formData);
      if (result?.error) {
        setError(result.error);
        return;
      }
      setSent(true);
      formRef.current?.reset();
      router.refresh();
    });
  }

  return (
    <Card className="p-5 bg-(image:--gradient-form-bg) max-w-md">
      <form ref={formRef} action={handleSubmit} className="flex flex-col gap-3">
        <label className="flex flex-col gap-1.5">
          <span className={label}>Invite by email</span>
          <input name="email" required type="email" className={field} placeholder="you@example.com" />
        </label>
        <p className="text-xs text-muted">
          They&rsquo;ll get full access to this household — every pet, visit, and record, same as you. No separate
          role or permission to set.
        </p>

        {error && <p className="text-xs text-coral">{error}</p>}
        {sent && !error && <p className="text-xs text-good">Invite sent.</p>}

        <div className="flex gap-2 mt-1">
          <button
            type="submit"
            disabled={pending}
            className="inline-flex items-center justify-center gap-2 text-sm font-semibold bg-(image:--gradient-button-bg) text-white px-4 py-2.5 rounded-lg hover:brightness-110 transition disabled:opacity-60"
          >
            <PlusIcon className="w-[.9em] h-[.9em]" />
            {pending ? "Sending…" : "Send invite"}
          </button>
        </div>
      </form>
    </Card>
  );
}

function MemberRow({ tenantId, member }: { tenantId: string; member: HouseholdMember }) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  return (
    <tr className="border-b border-line last:border-none">
      <td className="px-4 py-3 font-medium">{member.email}</td>
      <td className="px-4 py-3">
        <Badge tone={member.status === "active" ? "ok" : "trial"}>{member.status === "active" ? "Active" : "Invited"}</Badge>
      </td>
      <td className="px-4 py-3 text-muted">{formatDate(new Date(member.createdAt))}</td>
      <td className="px-4 py-3">
        <button
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              if (!confirm(`Remove ${member.email} from this household? They'll lose access immediately.`)) return;
              await removeHouseholdMember(tenantId, member.id);
              router.refresh();
            })
          }
          className="text-muted hover:text-coral border border-line rounded-md p-1.5 transition disabled:opacity-60"
          aria-label="Remove member"
          title="Remove"
        >
          {pending ? "…" : <TrashIcon className="w-4 h-4" />}
        </button>
      </td>
    </tr>
  );
}

export function HouseholdView({
  tenantId,
  name,
  members,
}: {
  tenantId: string;
  name: string;
  members: HouseholdMember[];
}) {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl mb-1 text-(--color-primary-text)">Care</h1>
        <p className="text-sm text-muted">Your household&rsquo;s name and who has access to it.</p>
      </div>

      <CareTabs active="household" />

      <div className="flex flex-col gap-1.5">
        <span className={label}>Name</span>
        <HouseholdNameForm tenantId={tenantId} name={name} />
      </div>

      <div className="flex flex-col gap-1.5">
        <span className={label}>Members</span>
        <p className="text-sm text-muted max-w-md">
          Everyone here — including you — has full access to this household&rsquo;s pets, visits, shopping, gallery,
          and billing. There are no separate roles.
        </p>

        <InviteForm tenantId={tenantId} />

        {members.length > 0 && (
          <Card className="overflow-x-auto mt-1">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-surface-2">
                  <th className="text-left text-[.68rem] uppercase tracking-[.05em] text-muted font-semibold px-4 py-2.5 border-b border-line">Email</th>
                  <th className="text-left text-[.68rem] uppercase tracking-[.05em] text-muted font-semibold px-4 py-2.5 border-b border-line">Status</th>
                  <th className="text-left text-[.68rem] uppercase tracking-[.05em] text-muted font-semibold px-4 py-2.5 border-b border-line">Invited</th>
                  <th className="text-left text-[.68rem] uppercase tracking-[.05em] text-muted font-semibold px-4 py-2.5 border-b border-line" />
                </tr>
              </thead>
              <tbody>
                {members.map((m) => (
                  <MemberRow key={m.id} tenantId={tenantId} member={m} />
                ))}
              </tbody>
            </table>
          </Card>
        )}
      </div>
    </div>
  );
}
