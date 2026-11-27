import type { Rarity, Slot } from "../types";

export interface ShopItem {
  id: string;
  name: string;
  slot: Slot;
  rarity: Rarity;
  price: number;
  /** Minimum rank index required to buy (0 = Recruit). */
  minRank: number;
  /** Granted for free when the player reaches `minRank`. */
  rankReward?: boolean;
  /** Owned by every new player. */
  starter?: boolean;
  description: string;
  /** Renderer key + main colour used by the SVG art. */
  art: string;
  color: string;
  accent?: string;
}

const i = (x: ShopItem) => x;

export const CATALOG: ShopItem[] = [
  // ---------------------------------------------------------------- outfits
  i({ id: "outfit-casual", name: "Field Notes Sweater", slot: "outfit", rarity: "common", price: 0, minRank: 0, starter: true, description: "Comfortable knitwear for early-morning reading.", art: "sweater", color: "#5b7fa6" }),
  i({ id: "outfit-blazer", name: "Analyst Blazer", slot: "outfit", rarity: "common", price: 120, minRank: 0, description: "A crisp blazer for your first briefings.", art: "blazer", color: "#3d4f66", accent: "#e8e2d4" }),
  i({ id: "outfit-navy-suit", name: "Navy Two-Piece Suit", slot: "outfit", rarity: "uncommon", price: 250, minRank: 0, description: "Tailored navy suit, the summit classic.", art: "suit", color: "#1f2f4f", accent: "#c94c4c" }),
  i({ id: "outfit-field-jacket", name: "Correspondent Field Jacket", slot: "outfit", rarity: "uncommon", price: 300, minRank: 1, description: "Many pockets, all of them full of notebooks.", art: "field", color: "#6b7a4b", accent: "#d8c99b" }),
  i({ id: "outfit-dress-uniform", name: "Ceremonial Dress Uniform", slot: "outfit", rarity: "rare", price: 600, minRank: 2, description: "Military-style parade uniform with gold piping. Purely ceremonial.", art: "uniform", color: "#2c3e2d", accent: "#e0b84a" }),
  i({ id: "outfit-diplomat", name: "Diplomatic Morning Coat", slot: "outfit", rarity: "rare", price: 700, minRank: 3, description: "Formal coat for treaty signings.", art: "suit", color: "#22252b", accent: "#9aa7b8" }),
  i({ id: "outfit-admiral", name: "Naval Dress Whites", slot: "outfit", rarity: "epic", price: 1200, minRank: 5, description: "Brilliant white naval-style dress uniform.", art: "uniform", color: "#f1f1ee", accent: "#d4a73a" }),
  i({ id: "outfit-strategist", name: "Midnight Strategist Suit", slot: "outfit", rarity: "legendary", price: 2500, minRank: 7, description: "Deep midnight suit with a subtle star-map lining.", art: "suit", color: "#151a3a", accent: "#ffd76a" }),
  i({ id: "outfit-officer", name: "Diplomatic Officer Suit", slot: "outfit", rarity: "rare", price: 0, minRank: 5, rankReward: true, description: "Awarded on promotion to Diplomatic Officer.", art: "suit", color: "#2e4057", accent: "#7fb7be" }),
  i({ id: "outfit-global", name: "Global Strategist Regalia", slot: "outfit", rarity: "legendary", price: 0, minRank: 9, rankReward: true, description: "The highest honour in WorldPulse.", art: "uniform", color: "#3b1f5c", accent: "#ffd76a" }),

  // ---------------------------------------------------------------- headwear
  i({ id: "hw-fedora", name: "Foreign Desk Fedora", slot: "headwear", rarity: "uncommon", price: 220, minRank: 0, description: "Old-school correspondent style.", art: "fedora", color: "#5a4632" }),
  i({ id: "hw-beret", name: "Blue Beret", slot: "headwear", rarity: "uncommon", price: 200, minRank: 1, description: "A sky-blue beret.", art: "beret", color: "#4a90d9" }),
  i({ id: "hw-headset", name: "Comms Headset", slot: "headwear", rarity: "rare", price: 450, minRank: 2, description: "Always on the line with the situation room.", art: "headset", color: "#2b2f36", accent: "#57d38c" }),
  i({ id: "hw-officer-cap", name: "Officer's Peaked Cap", slot: "headwear", rarity: "rare", price: 500, minRank: 3, description: "Peaked cap with a gold band. Ceremonial.", art: "cap", color: "#1f2a3a", accent: "#e0b84a" }),
  i({ id: "hw-laurel", name: "Golden Laurel", slot: "headwear", rarity: "legendary", price: 2000, minRank: 8, description: "For scholars of world affairs.", art: "laurel", color: "#e7b93b" }),

  // ---------------------------------------------------------------- accessories
  i({ id: "acc-lanyard", name: "Press Lanyard", slot: "accessory", rarity: "common", price: 60, minRank: 0, description: "Access all areas (almost).", art: "lanyard", color: "#d64545" }),
  i({ id: "acc-glasses", name: "Reading Glasses", slot: "accessory", rarity: "common", price: 80, minRank: 0, description: "For the fine print in trade agreements.", art: "glasses", color: "#222" }),
  i({ id: "acc-tie-red", name: "Summit Red Tie", slot: "accessory", rarity: "common", price: 90, minRank: 0, description: "A confident red tie.", art: "tie", color: "#b8323a" }),
  i({ id: "acc-earpiece", name: "Security Earpiece", slot: "accessory", rarity: "uncommon", price: 180, minRank: 1, description: "Coiled earpiece. Very serious.", art: "earpiece", color: "#cfd6dd" }),
  i({ id: "acc-observer-pin", name: "Observer Pin", slot: "accessory", rarity: "uncommon", price: 0, minRank: 1, rankReward: true, description: "Awarded on promotion to Observer.", art: "pin", color: "#4aa3df" }),
  i({ id: "acc-medal", name: "Service Medal", slot: "accessory", rarity: "rare", price: 550, minRank: 3, description: "Recognition for dedicated study.", art: "medal", color: "#e0b84a", accent: "#3a6ea5" }),
  i({ id: "acc-sash", name: "Diplomatic Sash", slot: "accessory", rarity: "epic", price: 1100, minRank: 5, description: "Worn at state receptions.", art: "sash", color: "#6a2c91", accent: "#ffd76a" }),

  // ---------------------------------------------------------------- HQ building rooms (the Office and Library are free)
  i({ id: "room-situation", name: "Situation Room", slot: "room", rarity: "rare", price: 300, minRank: 0, description: "Screens that track every story on the map, region by region.", art: "situation", color: "#1a2433" }),
  i({ id: "room-briefing", name: "Briefing Room", slot: "room", rarity: "epic", price: 450, minRank: 1, description: "Practise telling facts from claims and opinions, the core skill of reading the news.", art: "briefing", color: "#3a4f7a" }),
  i({ id: "room-rooftop", name: "Rooftop Observatory", slot: "room", rarity: "legendary", price: 700, minRank: 2, description: "A telescope over the world's capitals. How many can you name?", art: "rooftop", color: "#2d86cc" }),

  // ---------------------------------------------------------------- HQ backgrounds
  i({ id: "bg-basement", name: "Basement Office", slot: "background", rarity: "common", price: 0, minRank: 0, starter: true, description: "Humble beginnings, with a small window.", art: "basement", color: "#5d6b7a" }),
  i({ id: "bg-city", name: "City Skyline Office", slot: "background", rarity: "uncommon", price: 300, minRank: 0, description: "A view over a glittering capital.", art: "city", color: "#3f5f8a" }),
  i({ id: "bg-harbor", name: "Harbour View", slot: "background", rarity: "rare", price: 650, minRank: 2, description: "Watch the container ships come in.", art: "harbor", color: "#2f7fa8" }),
  i({ id: "bg-alpine", name: "Alpine Summit Retreat", slot: "background", rarity: "rare", price: 700, minRank: 3, description: "Where the quiet negotiations happen.", art: "alpine", color: "#6f9fc9" }),
  i({ id: "bg-situation", name: "Situation Room", slot: "background", rarity: "epic", price: 1500, minRank: 5, description: "Low light, many screens, big decisions.", art: "situation", color: "#1a2433" }),
  i({ id: "bg-embassy", name: "Embassy Study", slot: "background", rarity: "epic", price: 0, minRank: 6, rankReward: true, description: "Awarded on promotion to Ambassador.", art: "embassy", color: "#6b3e2e" }),
  i({ id: "bg-orbital", name: "Orbital Station View", slot: "background", rarity: "legendary", price: 3000, minRank: 7, description: "The whole planet through the window.", art: "orbital", color: "#0b1026" }),

  // ---------------------------------------------------------------- desks
  i({ id: "desk-folding", name: "Folding Desk", slot: "desk", rarity: "common", price: 0, minRank: 0, starter: true, description: "It wobbles a little.", art: "desk", color: "#9c7b55" }),
  i({ id: "desk-oak", name: "Oak Writing Desk", slot: "desk", rarity: "uncommon", price: 260, minRank: 0, description: "Solid oak, brass handles.", art: "desk", color: "#7a4f2a", accent: "#d4a73a" }),
  i({ id: "desk-glass", name: "Glass Executive Desk", slot: "desk", rarity: "rare", price: 600, minRank: 2, description: "Sleek, modern, spotless.", art: "desk-glass", color: "#9fd3e6" }),
  i({ id: "desk-command", name: "Command Console", slot: "desk", rarity: "epic", price: 1300, minRank: 4, description: "Glowing controls and a strategic overview.", art: "desk-command", color: "#24364d", accent: "#57d3c9" }),
  i({ id: "desk-wartable", name: "Strategist's Map Table", slot: "desk", rarity: "legendary", price: 0, minRank: 7, rankReward: true, description: "Awarded on promotion to Senior Strategist.", art: "desk-command", color: "#3b2a1a", accent: "#ffd76a" }),

  // ---------------------------------------------------------------- wall maps
  i({ id: "map-poster", name: "Paper Map Poster", slot: "wallmap", rarity: "common", price: 0, minRank: 0, starter: true, description: "Pinned at the corners.", art: "map", color: "#e9e1c8" }),
  i({ id: "map-antique", name: "Antique Atlas Map", slot: "wallmap", rarity: "uncommon", price: 280, minRank: 0, description: "Sepia tones in a carved frame.", art: "map", color: "#d9c08e", accent: "#6b4a2b" }),
  i({ id: "map-corkboard", name: "Analyst Corkboard", slot: "wallmap", rarity: "rare", price: 0, minRank: 3, rankReward: true, description: "Awarded on promotion to Junior Analyst. Red string included.", art: "cork", color: "#c49a6c" }),
  i({ id: "map-digital", name: "Digital World Map", slot: "wallmap", rarity: "rare", price: 800, minRank: 2, description: "A large glowing display.", art: "map-digital", color: "#0f2742", accent: "#4fd1ff" }),
  i({ id: "map-holo", name: "Holographic Map Wall", slot: "wallmap", rarity: "legendary", price: 2600, minRank: 7, description: "A shimmering hologram of the world.", art: "map-digital", color: "#160f33", accent: "#c08bff" }),

  // ---------------------------------------------------------------- monitors
  i({ id: "mon-laptop", name: "Trusty Laptop", slot: "monitor", rarity: "common", price: 0, minRank: 0, starter: true, description: "Covered in stickers.", art: "laptop", color: "#a9b4c2" }),
  i({ id: "mon-dual", name: "Dual Monitors", slot: "monitor", rarity: "uncommon", price: 350, minRank: 0, description: "Twice the news feeds.", art: "dual", color: "#2a2f37", accent: "#5fb3ff" }),
  i({ id: "mon-analyst", name: "Analyst Workstation", slot: "monitor", rarity: "rare", price: 0, minRank: 4, rankReward: true, description: "Awarded on promotion to Intelligence Analyst.", art: "dual", color: "#1d2a24", accent: "#57d38c" }),
  i({ id: "mon-wall", name: "Intelligence Monitor Wall", slot: "monitor", rarity: "epic", price: 1400, minRank: 4, description: "9 screens of world updates.", art: "wall", color: "#141b24", accent: "#ffb347" }),

  // ---------------------------------------------------------------- bookshelves
  i({ id: "shelf-crate", name: "Crate Bookshelf", slot: "bookshelf", rarity: "common", price: 0, minRank: 0, starter: true, description: "Stacked fruit crates. It works.", art: "shelf", color: "#b08a5b" }),
  i({ id: "shelf-oak", name: "Oak Bookcase", slot: "bookshelf", rarity: "uncommon", price: 240, minRank: 0, description: "Room for every almanac.", art: "shelf", color: "#6e4527" }),
  i({ id: "shelf-library", name: "Library Wall", slot: "bookshelf", rarity: "rare", price: 650, minRank: 2, description: "Floor-to-ceiling history and economics.", art: "shelf-tall", color: "#4d2f1c" }),

  // ---------------------------------------------------------------- flags
  i({ id: "flag-pennant", name: "WorldPulse Pennant", slot: "flag", rarity: "common", price: 60, minRank: 0, description: "Show your colours.", art: "pennant", color: "#2f80ed" }),
  i({ id: "flag-blue", name: "Blue Globe Banner", slot: "flag", rarity: "uncommon", price: 150, minRank: 0, description: "A banner with a white world emblem.", art: "banner", color: "#4b92db" }),
  i({ id: "flag-row", name: "Flags of the World Row", slot: "flag", rarity: "rare", price: 500, minRank: 2, description: "A row of colourful flags on poles.", art: "flagrow", color: "#d64545" }),

  // ---------------------------------------------------------------- globes
  i({ id: "globe-desk", name: "Desk Globe", slot: "globe", rarity: "common", price: 120, minRank: 0, description: "Spin it while thinking.", art: "globe", color: "#3d8fd1", accent: "#8a6a3b" }),
  i({ id: "globe-researcher", name: "Researcher's Globe", slot: "globe", rarity: "uncommon", price: 0, minRank: 2, rankReward: true, description: "Awarded on promotion to Researcher.", art: "globe", color: "#2c9c7a", accent: "#c0c6cc" }),
  i({ id: "globe-brass", name: "Brass Armillary Globe", slot: "globe", rarity: "rare", price: 520, minRank: 2, description: "Rings of polished brass.", art: "armillary", color: "#d4a73a" }),
  i({ id: "globe-floating", name: "Levitating Globe", slot: "globe", rarity: "epic", price: 1600, minRank: 5, description: "Floats over a magnetic base.", art: "globe-float", color: "#4fb3ff", accent: "#1d2430" }),

  // ---------------------------------------------------------------- collectibles (display shelf, cosmetic only)
  i({ id: "col-airliner", name: "Airliner Model", slot: "display", rarity: "common", price: 150, minRank: 0, description: "A long-haul airliner in desk scale.", art: "airliner", color: "#e8edf2", accent: "#2f80ed" }),
  i({ id: "col-tank-classic", name: "Classic Tank Model", slot: "display", rarity: "uncommon", price: 300, minRank: 0, description: "A museum-style historical tank model.", art: "tank", color: "#6b7a4b" }),
  i({ id: "col-jet", name: "Jet Fighter Model", slot: "display", rarity: "uncommon", price: 320, minRank: 1, description: "Die-cast display jet on a stand.", art: "jet", color: "#8b98a7" }),
  i({ id: "col-rover", name: "Planetary Rover Model", slot: "display", rarity: "uncommon", price: 400, minRank: 1, description: "6 wheels, 1 curious robot.", art: "rover", color: "#c9ccd1", accent: "#d4a73a" }),
  i({ id: "col-frigate", name: "Frigate Model", slot: "display", rarity: "rare", price: 600, minRank: 2, description: "A grey naval frigate on a wooden base.", art: "ship", color: "#7d8a99" }),
  i({ id: "col-tank-modern", name: "Modern Tank Model", slot: "display", rarity: "rare", price: 650, minRank: 2, description: "Desert-camo display model.", art: "tank", color: "#b59a6a" }),
  i({ id: "col-sub", name: "Submarine Model", slot: "display", rarity: "rare", price: 700, minRank: 3, description: "Sleek and silent.", art: "sub", color: "#2b323b" }),
  i({ id: "col-satellite", name: "Comms Satellite Model", slot: "display", rarity: "rare", price: 750, minRank: 3, description: "Gold foil and solar panels.", art: "satellite", color: "#d4a73a", accent: "#2f5d9e" }),
  i({ id: "col-icebreaker", name: "Polar Icebreaker Model", slot: "display", rarity: "epic", price: 1200, minRank: 4, description: "Bright red hull for Arctic routes.", art: "ship", color: "#c8372d" }),
  i({ id: "col-rocket", name: "Heavy-Lift Rocket Model", slot: "display", rarity: "epic", price: 1400, minRank: 4, description: "Ready for launch.", art: "rocket", color: "#f2f2f2", accent: "#d64545" }),
  i({ id: "col-carrier", name: "Aircraft Carrier Model", slot: "display", rarity: "epic", price: 1500, minRank: 5, description: "A huge flat-top with tiny aircraft.", art: "carrier", color: "#6f7c8b" }),
  i({ id: "col-station", name: "Space Station Model", slot: "display", rarity: "legendary", price: 2800, minRank: 7, description: "Modules, trusses and huge solar wings.", art: "station", color: "#cfd6dd", accent: "#d4a73a" }),
  i({ id: "col-golden-globe", name: "Golden Globe Trophy", slot: "display", rarity: "legendary", price: 0, minRank: 8, rankReward: true, description: "Awarded on promotion to Geopolitical Expert.", art: "trophy", color: "#e7b93b" }),
];

export const CATALOG_BY_ID = new Map(CATALOG.map((x) => [x.id, x]));
export const STARTER_ITEMS = CATALOG.filter((x) => x.starter).map((x) => x.id);
export const MAX_DISPLAY = 5;

export const RARITY_STYLE: Record<Rarity, { label: string; color: string; glow: string }> = {
  common: { label: "Common", color: "#9aa5b1", glow: "rgba(154,165,177,0.35)" },
  uncommon: { label: "Uncommon", color: "#3fbf6f", glow: "rgba(63,191,111,0.4)" },
  rare: { label: "Rare", color: "#3b8beb", glow: "rgba(59,139,235,0.45)" },
  epic: { label: "Epic", color: "#a35ce6", glow: "rgba(163,92,230,0.5)" },
  legendary: { label: "Legendary", color: "#f2a93b", glow: "rgba(242,169,59,0.55)" },
};

export const SLOT_LABEL: Record<Slot, string> = {
  outfit: "Outfits",
  headwear: "Headwear",
  accessory: "Accessories",
  background: "Office Styles",
  desk: "Desks",
  wallmap: "Wall Maps",
  monitor: "Monitors",
  bookshelf: "Bookshelves",
  flag: "Flags",
  globe: "Globes",
  display: "Collectibles",
  room: "Building Floors",
};
