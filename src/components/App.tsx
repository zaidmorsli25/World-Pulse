"use client";
import { useCallback, useEffect, useState } from "react";
import { getBackend, type Backend, type Me } from "@/lib/client/backend";
import { GameProvider } from "./game/GameProvider";
import { GameShell } from "./game/GameShell";
import { Landing } from "./landing/Landing";

function isResetLink() {
  const h = typeof window !== "undefined" ? window.location.hash : "";
  return h.startsWith("#/reset") || (h.includes("access_token=") && h.includes("type=recovery"));
}

export default function App() {
  const [backend, setBackend] = useState<Backend | null>(null);
  const [me, setMe] = useState<Me | null | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);
  const [reset, setReset] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const b = await getBackend();
      setBackend(b);
      if (isResetLink()) {
        setReset(true);
        setMe(null);
        return;
      }
      setReset(false);
      setMe(await b.me());
      setError(null);
    } catch (e) {
      setError((e as Error).message);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  if (error)
    return (
      <div className="grid h-dvh place-items-center bg-navy-900 p-6 text-center text-white">
        <div>
          <p className="font-display text-2xl">WorldPulse could not start.</p>
          <p className="mt-2 text-white/70">{error}</p>
          <button className="btn btn-primary mt-5" onClick={() => location.reload()}>
            Try again
          </button>
        </div>
      </div>
    );
  if (!backend || me === undefined)
    return (
      <div className="grid h-dvh place-items-center bg-navy-900">
        <div className="animate-pulse font-display text-3xl font-bold text-white">
          World<span className="text-gold-400">Pulse</span>
        </div>
      </div>
    );
  if (!me) return <Landing backend={backend} onAuthed={() => void refresh()} initialMode={reset ? "reset" : undefined} />;
  return (
    <GameProvider backend={backend} initial={me} onLogout={() => setMe(null)}>
      <GameShell />
    </GameProvider>
  );
}
