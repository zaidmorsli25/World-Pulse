import { FIGURES_BY_ID, type Figure } from "@/data/figures";
import { COUNTRY_BY_ID } from "@/lib/client/world";

const PALETTE = ["#24406f", "#12a594", "#8e4ec6", "#b0302f", "#2f9e6e", "#9c6a07", "#3e63dd", "#5b6b7d"];
const initials = (name: string) =>
  name
    .replace(/^(King|Queen|Emir)\s+/, "")
    .split(/\s+/)
    .filter((w) => /^[A-ZÀ-ÖØ-Þ]/.test(w))
    .map((w) => w[0])
    .slice(0, 2)
    .join("");

/** Initials portrait used until properly licensed photographs are added (see docs/CONTENT.md). */
export function FigureBadge({ figure, id, size = 48 }: { figure?: Figure; id?: string; size?: number }) {
  const f = figure ?? (id ? FIGURES_BY_ID.get(id) : undefined);
  if (!f) return null;
  if (f.portrait) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={f.portrait.url} alt={`${f.name} (${f.portrait.credit}, ${f.portrait.license})`} width={size} height={size} className="rounded-2xl object-cover" />;
  }
  const color = PALETTE[[...f.id].reduce((h, c) => h + c.charCodeAt(0), 0) % PALETTE.length];
  const flag = f.country ? COUNTRY_BY_ID.get(f.country)?.flag : "🌐";
  return (
    <span className="relative inline-grid shrink-0 place-items-center rounded-2xl font-display font-bold text-white shadow-pop" style={{ width: size, height: size, background: `linear-gradient(150deg, ${color}, #0d1a2e)`, fontSize: size * 0.36 }} aria-hidden>
      {initials(f.name)}
      <span className="absolute -bottom-1 -right-1 rounded-md bg-white px-0.5 leading-none shadow" style={{ fontSize: size * 0.3 }}>
        {flag}
      </span>
    </span>
  );
}
