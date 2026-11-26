"use client";
import { geoCentroid, geoGraticule10, geoNaturalEarth1, geoPath } from "d3-geo";
import { select } from "d3-selection";
import "d3-transition";
import { zoom as d3zoom, zoomIdentity, type ZoomBehavior, type ZoomTransform } from "d3-zoom";
import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { COUNTRY_BY_ID, useWorld } from "@/lib/client/world";
import type { NewsEvent } from "@/lib/types";
import { NavIcon } from "../ui/icons";
import { MarkerLayer } from "./Markers";

const LAND_TONES = ["#7dba67", "#86c06e", "#74b161", "#8fc677", "#7ab565", "#93c97c"];
const hash = (s: string) => [...s].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7);

export interface MapProps {
  events: NewsEvent[];
  completed: Set<string>;
  selectedCountry: string | null;
  onCountry: (id: string) => void;
  onEvent: (id: string) => void;
  focus: { id: string; nonce: number } | null;
  regionFocus: { region: string; nonce: number } | null;
  showLabels: boolean;
  showGraticule: boolean;
}

const REGION_BOXES: Record<string, [[number, number], [number, number]]> = {
  World: [[-170, -58], [180, 80]],
  Africa: [[-20, -36], [52, 38]],
  Americas: [[-140, -56], [-34, 72]],
  Asia: [[25, -11], [150, 56]],
  Europe: [[-25, 34], [45, 71]],
  Oceania: [[110, -48], [180, 5]],
  "Middle East": [[25, 12], [63, 42]],
};

function WorldMapInner(p: MapProps) {
  const { world, error } = useWorld();
  const wrapRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const gRef = useRef<SVGGElement>(null);
  const zoomRef = useRef<ZoomBehavior<SVGSVGElement, unknown> | null>(null);
  const [size, setSize] = useState({ w: 1200, h: 700 });
  const [t, setT] = useState<ZoomTransform>(zoomIdentity);
  const [hover, setHover] = useState<{ id: string; x: number; y: number } | null>(null);
  const raf = useRef(0);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setSize({ w: Math.max(320, e.contentRect.width), h: Math.max(320, e.contentRect.height) }));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const projection = useMemo(() => {
    const pad = Math.min(size.w, size.h) * 0.04;
    return geoNaturalEarth1().fitExtent(
      [
        [pad, pad],
        [size.w - pad, size.h - pad],
      ],
      { type: "Sphere" },
    );
  }, [size]);
  const path = useMemo(() => geoPath(projection), [projection]);

  const shapes = useMemo(() => {
    if (!world) return null;
    return {
      countries: world.features.map((f) => {
        const id = String(f.id);
        const info = COUNTRY_BY_ID.get(id);
        return {
          id,
          d: path(f) ?? "",
          area: path.area(f),
          centroid: path.centroid(f),
          fill: id === "ATA" ? "#e7f0f3" : LAND_TONES[hash(id) % LAND_TONES.length],
          disputed: !!info?.disputed,
          name: info?.name ?? f.properties.name,
        };
      }),
      land: path(world.land) ?? "",
      borders: path(world.borders) ?? "",
      sphere: path({ type: "Sphere" }) ?? "",
      graticule: path(geoGraticule10()) ?? "",
    };
  }, [world, path]);

  // d3-zoom: pan + zoom with mouse, wheel, touch and trackpad.
  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    const z = d3zoom<SVGSVGElement, unknown>()
      .scaleExtent([1, 48])
      .translateExtent([
        [-size.w * 0.15, -size.h * 0.1],
        [size.w * 1.15, size.h * 1.1],
      ])
      .on("zoom", (ev) => {
        if (gRef.current) gRef.current.setAttribute("transform", ev.transform.toString());
        cancelAnimationFrame(raf.current);
        raf.current = requestAnimationFrame(() => setT(ev.transform));
      });
    zoomRef.current = z;
    select(svg).call(z).on("dblclick.zoom", null);
    // The projection is refitted on resize, so the old transform no longer matches it. Start
    // from a fresh view; on tall phone screens zoom in a little so the land isn't a thin strip.
    const k = size.h > size.w * 1.1 ? Math.min(2.4, (size.h / size.w) * 0.9) : 1;
    select(svg).call(z.transform, zoomIdentity.translate(size.w / 2, size.h / 2).scale(k).translate(-size.w / 2, -size.h / 2));
    return () => {
      select(svg).on(".zoom", null);
    };
  }, [size]);

  const reduced = () => document.documentElement.classList.contains("reduce-motion");

  const zoomToBounds = useCallback(
    (b: [[number, number], [number, number]], maxK = 12) => {
      const svg = svgRef.current;
      const z = zoomRef.current;
      if (!svg || !z) return;
      const [[x0, y0], [x1, y1]] = b;
      const k = Math.min(maxK, 0.82 / Math.max((x1 - x0) / size.w, (y1 - y0) / size.h));
      const tr = zoomIdentity
        .translate(size.w / 2, size.h / 2)
        .scale(Math.max(1, k))
        .translate(-(x0 + x1) / 2, -(y0 + y1) / 2);
      select(svg)
        .transition()
        .duration(reduced() ? 0 : 750)
        .call(z.transform, tr);
    },
    [size],
  );

  const zoomBy = (f: number) => {
    const svg = svgRef.current;
    if (svg && zoomRef.current)
      select(svg)
        .transition()
        .duration(reduced() ? 0 : 300)
        .call(zoomRef.current.scaleBy, f);
  };
  const reset = () => {
    const svg = svgRef.current;
    if (svg && zoomRef.current)
      select(svg)
        .transition()
        .duration(reduced() ? 0 : 600)
        .call(zoomRef.current.transform, zoomIdentity);
  };

  // Fly to a country (search results, "show on map" links).
  useEffect(() => {
    if (!p.focus || !world) return;
    const f = world.byId.get(p.focus.id);
    if (!f) return;
    // Use the largest polygon's bounds for countries with far-flung territories.
    const b = path.bounds(f);
    const wide = b[1][0] - b[0][0] > size.w * 0.5;
    if (wide) {
      const c = projection(geoCentroid(f)) ?? [size.w / 2, size.h / 2];
      zoomToBounds([
        [c[0] - 60, c[1] - 40],
        [c[0] + 60, c[1] + 40],
      ]);
    } else zoomToBounds(b, 10);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [p.focus?.nonce, world]);

  useEffect(() => {
    if (!p.regionFocus) return;
    if (p.regionFocus.region === "World") return reset();
    const box = REGION_BOXES[p.regionFocus.region];
    if (!box) return;
    const a = projection(box[0]);
    const b = projection(box[1]);
    if (a && b)
      zoomToBounds([
        [Math.min(a[0], b[0]), Math.min(a[1], b[1])],
        [Math.max(a[0], b[0]), Math.max(a[1], b[1])],
      ]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [p.regionFocus?.nonce]);

  const k = t.k;
  const labels = useMemo(() => {
    if (!shapes || !p.showLabels) return [];
    return shapes.countries
      .filter((c) => c.id !== "ATA" && c.area * k * k > 2600 && Number.isFinite(c.centroid[0]))
      .sort((a, b) => b.area - a.area)
      .slice(0, 90);
  }, [shapes, k, p.showLabels]);

  const eventCountries = useMemo(() => new Set(p.events.flatMap((e) => e.countries.slice(0, 1))), [p.events]);
  const hovered = hover ? COUNTRY_BY_ID.get(hover.id) : null;

  return (
    <div ref={wrapRef} className="absolute inset-0 overflow-hidden" style={{ background: "radial-gradient(ellipse at 50% 40%, #2a7fc4 0%, #1d63a3 55%, #154c82 100%)" }}>
      <svg ref={svgRef} width={size.w} height={size.h} className="block touch-none select-none" role="img" aria-label="Interactive world map. Use the search box to find countries, or the zoom buttons to zoom.">
        <defs>
          <radialGradient id="ocean" cx="50%" cy="45%" r="70%">
            <stop offset="0%" stopColor="#3b95d6" />
            <stop offset="60%" stopColor="#2b7cc0" />
            <stop offset="100%" stopColor="#1f67a8" />
          </radialGradient>
          <pattern id="waves" width="46" height="24" patternUnits="userSpaceOnUse">
            <path d="M2 14 q 6 -6 12 0 t 12 0" fill="none" stroke="#ffffff" strokeOpacity="0.07" strokeWidth="1.4" />
          </pattern>
          <pattern id="hatch" width="5" height="5" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <line x1="0" y1="0" x2="0" y2="5" stroke="#3b5a2f" strokeOpacity="0.35" strokeWidth="1.6" />
          </pattern>
          <filter id="landShadow" x="-5%" y="-5%" width="110%" height="110%">
            <feGaussianBlur stdDeviation="2.2" />
          </filter>
          <filter id="relief" x="0" y="0" width="100%" height="100%">
            <feTurbulence type="fractalNoise" baseFrequency="0.035" numOctaves="3" seed="7" result="noise" />
            <feDiffuseLighting in="noise" lightingColor="#ffffff" surfaceScale="1.4" result="light">
              <feDistantLight azimuth="225" elevation="55" />
            </feDiffuseLighting>
            <feComposite in="light" in2="SourceGraphic" operator="in" />
          </filter>
        </defs>
        <g ref={gRef}>
          {shapes && (
            <>
              <path d={shapes.sphere} fill="url(#ocean)" />
              <path d={shapes.sphere} fill="url(#waves)" />
              {p.showGraticule && <path d={shapes.graticule} fill="none" stroke="#ffffff" strokeOpacity={0.1} strokeWidth={0.8} vectorEffect="non-scaling-stroke" />}
              {/* shallow-water glow and drop shadow give the landmasses depth */}
              <path d={shapes.land} fill="none" stroke="#8fd3f4" strokeOpacity={0.35} strokeWidth={6} vectorEffect="non-scaling-stroke" strokeLinejoin="round" />
              <path d={shapes.land} fill="#0b2f57" opacity={0.45} transform="translate(1.4 2.4)" filter="url(#landShadow)" />
              <g>
                {shapes.countries.map((c) => {
                  const sel = p.selectedCountry === c.id;
                  const hov = hover?.id === c.id;
                  return (
                    <path
                      key={c.id}
                      d={c.d}
                      className="country"
                      fill={sel ? "#f7c552" : hov ? "#a9db8d" : c.fill}
                      onPointerMove={(e) => setHover({ id: c.id, x: e.clientX, y: e.clientY })}
                      onPointerLeave={() => setHover((h) => (h?.id === c.id ? null : h))}
                      onClick={() => p.onCountry(c.id)}
                    />
                  );
                })}
              </g>
              {/* subtle relief texture */}
              <path d={shapes.land} fill="#000" opacity={0.08} filter="url(#relief)" pointerEvents="none" style={{ mixBlendMode: "multiply" }} />
              {shapes.countries
                .filter((c) => c.disputed)
                .map((c) => (
                  <path key={`d-${c.id}`} d={c.d} fill="url(#hatch)" stroke="#3b5a2f" strokeOpacity={0.6} strokeDasharray="3 2" strokeWidth={0.8} vectorEffect="non-scaling-stroke" pointerEvents="none" />
                ))}
              <path d={shapes.borders} fill="none" stroke="#3f7334" strokeOpacity={0.55} strokeWidth={0.7} vectorEffect="non-scaling-stroke" pointerEvents="none" />
              <path d={shapes.land} fill="none" stroke="#2f5f28" strokeOpacity={0.6} strokeWidth={0.9} vectorEffect="non-scaling-stroke" pointerEvents="none" />
              {p.selectedCountry && (
                <path d={shapes.countries.find((c) => c.id === p.selectedCountry)?.d} fill="none" stroke="#fff" strokeWidth={2.4} vectorEffect="non-scaling-stroke" pointerEvents="none" />
              )}
              {labels.map((c) => (
                <text
                  key={`l-${c.id}`}
                  x={c.centroid[0]}
                  y={c.centroid[1]}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fontSize={Math.min(13, 6 + Math.sqrt(c.area) * 0.06) / k}
                  fontFamily="'Fredoka Variable', system-ui"
                  fontWeight={600}
                  fill={eventCountries.has(c.id) ? "#173a1a" : "#24502a"}
                  fillOpacity={0.78}
                  stroke="#e7f5dc"
                  strokeOpacity={0.6}
                  strokeWidth={2.2 / k}
                  paintOrder="stroke"
                  pointerEvents="none"
                >
                  {c.name}
                </text>
              ))}
            </>
          )}
        </g>
      </svg>

      <MarkerLayer events={p.events} completed={p.completed} projection={projection} transform={t} onEvent={p.onEvent} zoomToBounds={zoomToBounds} size={size} />

      {hovered && hover && (
        <div className="pointer-events-none fixed z-30 rounded-xl bg-navy-900/90 px-3 py-1.5 text-sm font-semibold text-white shadow-game" style={{ left: hover.x + 14, top: hover.y + 14 }}>
          <span className="mr-1.5">{hovered.flag}</span>
          {hovered.name}
          {hovered.disputed && <span className="ml-2 text-xs font-normal text-gold-300">disputed status</span>}
        </div>
      )}

      <div className="absolute bottom-24 right-3 z-20 flex flex-col gap-2 sm:bottom-6 sm:right-4">
        <button className="btn btn-ghost h-11 w-11 !p-0" onClick={() => zoomBy(1.8)} aria-label="Zoom in">
          <NavIcon.plus size={20} />
        </button>
        <button className="btn btn-ghost h-11 w-11 !p-0" onClick={() => zoomBy(1 / 1.8)} aria-label="Zoom out">
          <NavIcon.minus size={20} />
        </button>
        <button className="btn btn-ghost h-11 w-11 !p-0" onClick={reset} aria-label="Reset map view">
          <NavIcon.home size={20} />
        </button>
      </div>

      {!world && !error && (
        <div className="absolute inset-0 grid place-items-center">
          <div className="hud-pill animate-pulse font-display text-lg">Loading the world…</div>
        </div>
      )}
      {error && (
        <div className="absolute inset-0 grid place-items-center">
          <div className="panel p-6 text-center">
            <p className="font-display text-lg">The map could not load.</p>
            <button className="btn btn-blue mt-3" onClick={() => location.reload()}>
              Try again
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export const WorldMap = memo(WorldMapInner);
