"use client";

import { useState } from "react";
import { Card, Pill } from "@/components/ui";
import { PlusIcon } from "@/components/icons";
import { team } from "@/lib/mock-data";

const roles = ["caregiver", "viewer"];

export default function TeamPage() {
  const [role, setRole] = useState("caregiver");

  return (
    <div className="flex flex-col gap-6 max-w-2xl">
      <div>
        <h1 className="text-2xl mb-1">Team</h1>
        <p className="text-sm text-muted">Invite the people who help care for these pets</p>
      </div>

      <Card className="p-5">
        <div className="flex flex-col divide-y divide-line mb-5">
          {team.map((m) => (
            <div key={m.email} className="flex items-center justify-between py-2.5 text-sm">
              <span>{m.email}</span>
              <div className="flex items-center gap-2">
                <Pill>{m.role}</Pill>
                {m.status && <Pill dotColor="var(--accent)">{m.status}</Pill>}
              </div>
            </div>
          ))}
        </div>

        <div className="flex flex-col sm:flex-row gap-2.5">
          <input
            type="email"
            placeholder="Invite by email"
            className="flex-1 bg-paper border border-line rounded-lg px-3.5 py-2.5 text-sm outline-none focus:border-primary transition"
          />
          <select
            value={role}
            onChange={(e) => setRole(e.target.value)}
            className="bg-paper border border-line rounded-lg px-3.5 py-2.5 text-sm outline-none focus:border-primary transition"
          >
            {roles.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
          <button className="inline-flex items-center justify-center gap-2 text-sm font-semibold bg-accent text-accent-ink px-4 py-2.5 rounded-lg hover:brightness-95 transition whitespace-nowrap">
            <PlusIcon className="w-[.9em] h-[.9em]" />
            Send invite
          </button>
        </div>
      </Card>

      <Card className="p-5">
        <h2 className="text-sm font-semibold mb-3">Roles</h2>
        <div className="flex flex-col gap-3 text-sm">
          <div className="grid grid-cols-[110px_1fr] gap-3">
            <span className="text-muted">owner</span>
            <span>Manages billing, can remove any member. One per workspace minimum.</span>
          </div>
          <div className="grid grid-cols-[110px_1fr] gap-3">
            <span className="text-muted">caregiver</span>
            <span>Full read/write on pets, health, shopping, tasks, and gallery.</span>
          </div>
          <div className="grid grid-cols-[110px_1fr] gap-3">
            <span className="text-muted">viewer</span>
            <span>Read-only — for a pet-sitter, co-parent, or a vet given temporary access.</span>
          </div>
        </div>
      </Card>
    </div>
  );
}
