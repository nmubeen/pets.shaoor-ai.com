"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Card, Avatar } from "@/components/ui";
import { PlusIcon } from "@/components/icons";
import { createGroup, updateGroup, deleteGroup } from "@/lib/actions/groups";
import type { Group } from "@/lib/groups";
import type { RosterItem } from "@/lib/roster";

const field = "bg-paper border border-line rounded-lg px-3.5 py-2.5 text-sm outline-none focus:border-primary transition";
const label = "text-[.68rem] uppercase tracking-[.05em] text-muted";

function GroupForm({
  tenantId,
  pets,
  mode = "add",
  initial,
  onDone,
}: {
  tenantId: string;
  /** Every individual pet in the workspace — the pool a group can be built from. */
  pets: RosterItem[];
  mode?: "add" | "edit";
  initial?: Group;
  onDone: () => void;
}) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [selected, setSelected] = useState(() => new Set(initial?.members.map((m) => m.id) ?? []));

  function toggle(petId: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(petId)) next.delete(petId);
      else next.add(petId);
      return next;
    });
  }

  function handleSubmit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const result =
        mode === "edit" && initial
          ? await updateGroup(tenantId, initial.id, formData)
          : await createGroup(tenantId, formData);
      if (result?.error) {
        setError(result.error);
        return;
      }
      onDone();
    });
  }

  return (
    <Card className="p-5">
      <form action={handleSubmit} className="flex flex-col gap-3">
        <label className="flex flex-col gap-1.5">
          <span className={label}>Name</span>
          <input name="name" required defaultValue={initial?.name} className={field} placeholder="Adult cats" />
        </label>

        <label className="flex flex-col gap-1.5">
          <span className={label}>Photo (optional)</span>
          {mode === "edit" && initial?.photoUrl && (
            <div className="flex items-center gap-2.5 mb-1">
              <Avatar label={initial.initials} color={initial.color} photoUrl={initial.photoUrl} />
              <label className="flex items-center gap-1.5 text-xs text-muted">
                <input type="checkbox" name="remove_photo" className="accent-coral" />
                Remove current photo
              </label>
            </div>
          )}
          {mode === "edit" && <input type="hidden" name="current_photo_path" value={initial?.photoPath ?? ""} />}
          <input
            type="file"
            name="photo"
            accept="image/jpeg,image/png,image/webp,image/gif"
            className={`${field} file:mr-3 file:border-0 file:bg-surface-2 file:text-ink file:rounded-md file:px-2.5 file:py-1 file:text-xs`}
          />
        </label>

        <div className="flex flex-col gap-1.5">
          <span className={label}>Members ({selected.size} selected — choose at least 2)</span>
          {pets.length === 0 ? (
            <p className="text-xs text-muted">Add some individual pets first.</p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-56 overflow-y-auto border border-line rounded-lg p-3">
              {pets.map((p) => (
                <label key={p.id} className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    name="pet_ids"
                    value={p.id}
                    checked={selected.has(p.id)}
                    onChange={() => toggle(p.id)}
                    className="accent-primary"
                  />
                  <span className="truncate">{p.name}</span>
                </label>
              ))}
            </div>
          )}
        </div>

        {error && <p className="text-xs text-coral">{error}</p>}

        <div className="flex gap-2 mt-1">
          <button
            type="submit"
            disabled={pending}
            className="inline-flex items-center justify-center gap-2 text-sm font-semibold bg-accent text-accent-ink px-4 py-2.5 rounded-lg hover:brightness-95 transition disabled:opacity-60"
          >
            {pending ? "Saving…" : mode === "edit" ? "Save changes" : "Create group"}
          </button>
          <button type="button" onClick={onDone} className="text-xs text-muted hover:text-ink">
            Cancel
          </button>
        </div>
      </form>
    </Card>
  );
}

function DeleteButton({ tenantId, groupId, name }: { tenantId: string; groupId: string; name: string }) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  return (
    <button
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          if (!confirm(`Delete the "${name}" group? The pets in it aren't affected — only this saved grouping goes away.`)) return;
          await deleteGroup(tenantId, groupId);
          router.refresh();
        })
      }
      className="text-xs text-muted hover:text-coral transition disabled:opacity-60"
    >
      {pending ? "…" : "Delete"}
    </button>
  );
}

export function GroupsPanel({ tenantId, groups, roster }: { tenantId: string; groups: Group[]; roster: RosterItem[] }) {
  const [showAdd, setShowAdd] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const router = useRouter();

  const pets = roster.filter((r) => r.kind === "pet");

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-lg">Groups</h2>
          <p className="text-sm text-muted">Saved collections of 2 or more pets — e.g. all your cats, or just the kittens</p>
        </div>
        {pets.length >= 2 && (
          <button
            onClick={() => {
              setEditingId(null);
              setShowAdd((v) => !v);
            }}
            className="inline-flex items-center gap-2 text-sm font-semibold bg-accent text-accent-ink px-4 py-2.5 rounded-lg hover:brightness-95 transition"
          >
            <PlusIcon className="w-[.9em] h-[.9em]" />
            Add group
          </button>
        )}
      </div>

      {showAdd && (
        <GroupForm tenantId={tenantId} pets={pets} onDone={() => { setShowAdd(false); router.refresh(); }} />
      )}

      {pets.length < 2 ? (
        <p className="text-xs text-muted">Add at least 2 individual pets to start grouping them.</p>
      ) : groups.length === 0 ? (
        !showAdd && <Card className="p-6 text-center text-sm text-muted">No groups yet.</Card>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {groups.map((g) => {
            if (editingId === g.id) {
              return (
                <div key={g.id} className="sm:col-span-2 lg:col-span-3">
                  <GroupForm
                    tenantId={tenantId}
                    pets={pets}
                    mode="edit"
                    initial={g}
                    onDone={() => {
                      setEditingId(null);
                      router.refresh();
                    }}
                  />
                </div>
              );
            }

            return (
              <Card key={g.id} className="p-5 flex flex-col gap-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <Avatar label={g.initials} color={g.color} photoUrl={g.photoUrl} />
                    <div className="min-w-0">
                      <div className="font-semibold text-base truncate">{g.name}</div>
                      <div className="text-xs text-muted">
                        {g.members.length} pet{g.members.length === 1 ? "" : "s"}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 flex-none">
                    <button onClick={() => setEditingId(g.id)} className="text-xs text-muted hover:text-ink transition">
                      Edit
                    </button>
                    <DeleteButton tenantId={tenantId} groupId={g.id} name={g.name} />
                  </div>
                </div>
                <div className="text-xs text-muted truncate">{g.members.map((m) => m.name).join(", ")}</div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
