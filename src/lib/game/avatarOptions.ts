// How many choices each avatar option has. Shared by the server (validation) and the avatar drawing.
// Lists only ever grow, so saved avatars keep their look.
export const AVATAR_LIMITS = {
  skin: 8,
  hair: 14,
  hairColor: 12,
  backdrop: 10,
  face: 4,
  eyes: 5,
  eyeColor: 5,
  brows: 5,
  mouth: 5,
  facialHair: 5,
  glasses: 4,
  details: 4,
} as const;

/** The parts every avatar has had from the start; the rest are optional. */
export const REQUIRED_AVATAR_KEYS = ["skin", "hair", "hairColor", "backdrop"] as const;
