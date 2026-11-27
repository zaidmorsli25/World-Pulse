"use client";
import { useMemo, useState } from "react";
import { FIGURES, ROLE_LABEL, VERIFIED_AS_OF, type FigureRole } from "@/data/figures";
import { COUNTRY_BY_ID } from "@/lib/client/world";
import { FigureBadge } from "../figures/FigureBadge";
import { useGame } from "../game/GameProvider";
import { fmtDay, SectionPanel } from "../ui/bits";

const GROUPS: { id: string; label: string; roles: FigureRole[] }[] = [
  { id: "all", label: "All", roles: [] },
  { id: "state", label: "Heads of state", roles: ["head_of_state", "head_of_state_and_government", "monarch"] },
  { id: "gov", label: "Heads of government", roles: ["head_of_government", "head_of_state_and_government"] },
  { id: "ministers", label: "Ministers & deputies", roles: ["foreign_minister", "minister", "deputy"] },
  { id: "opposition", label: "Opposition & party leaders", roles: ["opposition", "party_leader"] },
  { id: "orgs", label: "International organizations", roles: ["org_leader"] },
  { id: "business", label: "Business & technology", roles: ["business_leader"] },
];

export function FiguresSection() {
  const { openFigure, player } = useGame();
  const [q, setQ] = useState("");
  const [group, setGroup] = useState("all");
  const list = useMemo(() => {
    const roles = GROUPS.find((g) => g.id === group)!.roles;
    const n = q.toLowerCase();
    return FIGURES.filter((f) => (roles.length === 0 || roles.includes(f.role)) && (!n || `${f.name} ${f.position} ${f.organization ?? ""} ${f.country ? COUNTRY_BY_ID.get(f.country)?.name : ""}`.toLowerCase().includes(n)));
  }, [q, group]);

  return (
    <SectionPanel title="Political Figures" subtitle={`${FIGURES.length} leaders, officials and business figures · verified as of ${fmtDay(VERIFIED_AS_OF)} · ${player.figuresViewed.length} profiles opened`}>
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <input className="input sm:max-w-xs" placeholder="Search by name, country or office…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search political figures" />
        <div className="scroll-thin flex gap-1.5 overflow-x-auto pb-1">
          {GROUPS.map((g) => (
            <button key={g.id} onClick={() => setGroup(g.id)} aria-pressed={group === g.id} className={`shrink-0 rounded-xl px-3 py-1.5 text-sm font-semibold ${group === g.id ? "bg-navy-800 text-white" : "bg-parchment-200 text-navy-800 hover:bg-parchment-100"}`}>
              {g.label}
            </button>
          ))}
        </div>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {list.map((f) => {
          const c = f.country ? COUNTRY_BY_ID.get(f.country) : undefined;
          const seen = player.figuresViewed.includes(f.id);
          return (
            <button key={f.id} onClick={() => openFigure(f.id)} className="group flex items-center gap-3 rounded-2xl border-2 border-parchment-200 bg-white p-3 text-left transition hover:-translate-y-0.5 hover:border-ocean-400 hover:shadow-md">
              <FigureBadge figure={f} size={52} />
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-1.5 font-display font-semibold text-navy-900">
                  <span className="truncate">{f.name}</span>
                  {seen && <span className="text-xs text-land-600" title="Profile opened">✓</span>}
                </span>
                <span className="block truncate text-xs text-navy-700/80">{f.position}</span>
                <span className="mt-1 flex flex-wrap gap-1">
                  <span className="chip bg-ocean-400/15 text-ocean-700">{ROLE_LABEL[f.role]}</span>
                  <span className="chip bg-parchment-200 text-navy-800">{c ? `${c.flag} ${c.name}` : `🌐 ${f.organization}`}</span>
                </span>
              </span>
            </button>
          );
        })}
      </div>
      {list.length === 0 && <p className="py-10 text-center text-navy-700/70">No figures match your search.</p>}
      <p className="mt-6 text-xs text-navy-700/60">Portraits are shown as initials until licensed photographs are added. Leadership changes often; profiles show the date each office was last verified.</p>
    </SectionPanel>
  );
}
