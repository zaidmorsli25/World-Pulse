"use client";
import { VERIFIED_AS_OF } from "@/data/figures";
import { sound } from "@/lib/client/sound";
import { useGame } from "../game/GameProvider";
import { fmtDay, SectionPanel, timeAgo } from "../ui/bits";

function Toggle({ label, hint, on, onChange }: { label: string; hint?: string; on: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-4 py-2.5">
      <span>
        <span className="block font-semibold text-navy-900">{label}</span>
        {hint && <span className="block text-xs text-navy-700/70">{hint}</span>}
      </span>
      <button role="switch" aria-checked={on} onClick={() => onChange(!on)} className={`relative h-7 w-12 shrink-0 rounded-full transition ${on ? "bg-land-500" : "bg-parchment-200"}`}>
        <span className={`absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition-all ${on ? "left-[22px]" : "left-0.5"}`} />
        <span className="sr-only">{label}</span>
      </button>
    </label>
  );
}

function Slider({ label, value, onChange, disabled }: { label: string; value: number; onChange: (v: number) => void; disabled?: boolean }) {
  return (
    <label className={`flex items-center gap-4 py-2 ${disabled ? "opacity-50" : ""}`}>
      <span className="w-28 shrink-0 text-sm font-semibold text-navy-800">{label}</span>
      <input type="range" min={0} max={1} step={0.05} value={value} disabled={disabled} onChange={(e) => onChange(Number(e.target.value))} className="flex-1 accent-ocean-500" />
      <span className="w-10 text-right text-xs tabular-nums text-navy-700">{Math.round(value * 100)}%</span>
    </label>
  );
}

const Card = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <section className="rounded-3xl bg-white p-5 ring-1 ring-parchment-200">
    <h2 className="mb-1 font-display text-lg font-bold text-navy-900">{title}</h2>
    <div className="divide-y divide-parchment-200">{children}</div>
  </section>
);

export function SettingsSection() {
  const { settings, setSettings, logout, me, news } = useGame();

  return (
    <SectionPanel title="Settings" subtitle="Preferences are saved on this device.">
      <div className="grid gap-4 lg:grid-cols-2">
        <Card title="Sound">
          <Toggle
            label="Sound effects"
            hint="Clicks, coins, correct and incorrect answers"
            on={settings.sfxOn}
            onChange={(v) => {
              setSettings({ sfxOn: v });
              if (v) setTimeout(() => sound.play("coin"), 50);
            }}
          />
          <Slider label="Effects volume" value={settings.sfxVolume} disabled={!settings.sfxOn} onChange={(v) => setSettings({ sfxVolume: v })} />
          <Toggle label="Background music" hint="Calm generated ambient music" on={settings.musicOn} onChange={(v) => setSettings({ musicOn: v })} />
          <Slider label="Music volume" value={settings.musicVolume} disabled={!settings.musicOn} onChange={(v) => setSettings({ musicVolume: v })} />
        </Card>

        <Card title="Motion and map">
          <div className="py-2.5">
            <span className="mb-1.5 block font-semibold text-navy-900">Animations</span>
            <div className="grid grid-cols-3 gap-1 rounded-2xl bg-parchment-200 p-1">
              {(
                [
                  ["system", "Match device"],
                  ["reduced", "Reduced"],
                  ["full", "Full"],
                ] as const
              ).map(([v, l]) => (
                <button key={v} onClick={() => setSettings({ motion: v })} aria-pressed={settings.motion === v} className={`rounded-xl py-1.5 text-sm font-semibold ${settings.motion === v ? "bg-white shadow" : "text-navy-700"}`}>
                  {l}
                </button>
              ))}
            </div>
          </div>
          <Toggle label="Country labels" hint="Show names on the map as you zoom in" on={settings.showLabels} onChange={(v) => setSettings({ showLabels: v })} />
          <Toggle label="Map grid lines" hint="Latitude and longitude lines" on={settings.showGraticule} onChange={(v) => setSettings({ showGraticule: v })} />
          <Toggle label="Always show trend lines" hint="Keep the threads between linked stories on the map, not just while you hover a marker" on={settings.trendLinesAlways} onChange={(v) => setSettings({ trendLinesAlways: v })} />
        </Card>

        <Card title="Account">
          <div className="py-2.5 text-sm">
            <p>
              Signed in as <b>{me.user.username}</b>
              {me.user.email && <span className="text-navy-700/80"> ({me.user.email})</span>}
            </p>
            {me.backend === "browser" && <p className="mt-1 rounded-xl bg-gold-300/30 px-3 py-2 text-navy-900">This is the standalone demo. Your account and progress are saved only in this browser.</p>}
          </div>
          <div className="py-3">
            <button className="btn btn-dark" onClick={() => void logout()}>
              Log out
            </button>
          </div>
        </Card>

        <Card title="About the news">
          <div className="space-y-2 py-2.5 text-sm text-navy-800">
            <p>
              Mode: <b>{news?.mode === "live" ? "Live news" : "Demo scenarios"}</b> · updated {timeAgo(news?.updatedAt ?? null)}
            </p>
            <p>Live briefings are summaries of reporting from BBC News, NPR, The New York Times, The Wall Street Journal, Bloomberg and Reuters. Each briefing links to the original articles. WorldPulse never republishes full articles and does not bypass paywalls.</p>
            <p>Demo scenarios are fictional and are labelled as such everywhere they appear.</p>
            <p>Political figure details were last verified on {fmtDay(VERIFIED_AS_OF)}. Officeholders change, so check the linked sources for the latest.</p>
            <p className="text-xs text-navy-700/70">Map data: Natural Earth (public domain). Country facts: world-countries (ODbL). Borders and names shown do not imply endorsement of any territorial claim.</p>
          </div>
        </Card>
      </div>
    </SectionPanel>
  );
}
