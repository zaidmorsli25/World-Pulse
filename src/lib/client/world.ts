"use client";
import { useEffect, useState } from "react";
import { feature, merge, mesh } from "topojson-client";
import type { Feature, FeatureCollection, Geometry, MultiLineString, MultiPolygon } from "geojson";
import type { GeometryCollection, Topology } from "topojson-specification";
import countries from "@/data/generated/countries.json";

export interface CountryInfo {
  id: string;
  iso2: string | null;
  name: string;
  official: string;
  flag: string;
  capital: string | null;
  region: string | null;
  subregion: string | null;
  areaKm2: number | null;
  languages: string[];
  currencies: string[];
  latlng: number[] | null;
  borders: string[];
  unMember: boolean;
  independent: boolean;
  note: string | null;
  disputed: boolean;
  parent: string | null;
}

export const COUNTRIES = countries as CountryInfo[];
export const COUNTRY_BY_ID = new Map(COUNTRIES.map((c) => [c.id, c]));

export interface World {
  features: Feature<Geometry, { name: string }>[];
  byId: Map<string, Feature<Geometry, { name: string }>>;
  land: MultiPolygon;
  borders: MultiLineString;
}

let worldPromise: Promise<World> | null = null;

export function loadWorld(): Promise<World> {
  if (!worldPromise) {
    const base = process.env.NEXT_PUBLIC_STANDALONE === "1" ? "./geo/world-50m.json" : "/geo/world-50m.json";
    worldPromise = fetch(base)
      .then((r) => {
        if (!r.ok) throw new Error("map data failed to load");
        return r.json();
      })
      .then((topo: Topology<{ countries: GeometryCollection<{ name: string }> }>) => {
        const fc = feature(topo, topo.objects.countries) as FeatureCollection<Geometry, { name: string }>;
        const features = fc.features.map((f) => ({ ...f, id: String(f.id) }));
        return {
          features,
          byId: new Map(features.map((f) => [String(f.id), f])),
          land: merge(topo, topo.objects.countries.geometries as never),
          borders: mesh(topo, topo.objects.countries, (a, b) => a !== b),
        };
      });
    worldPromise.catch(() => {
      worldPromise = null;
    });
  }
  return worldPromise;
}

export function useWorld(): { world: World | null; error: string | null } {
  const [world, setWorld] = useState<World | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let alive = true;
    loadWorld()
      .then((w) => alive && setWorld(w))
      .catch((e) => alive && setError(e.message));
    return () => {
      alive = false;
    };
  }, []);
  return { world, error };
}
