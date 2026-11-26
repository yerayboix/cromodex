/**
 * Card lists per collection, keyed by `app.collections.slug`.
 * Pure module: safe to import from client and server code alike.
 */

function range(prefix: string, from: number, to: number): string[] {
  return Array.from({ length: to - from + 1 }, (_, i) => `${prefix}${from + i}`);
}

/** Visual themes; each one is a `[data-theme]` block in globals.css. */
export type ThemeId = "one-piece";

export const COLLECTIONS = {
  "rumbo-a-egghead": {
    name: "One Piece — Rumbo a Egghead",
    /** Name shown in the app chrome. */
    shortName: "Rumbo a Egghead",
    /** One-line description for the collection picker (UI copy). */
    blurb: "One Piece, Panini. 204 cromos.",
    theme: "one-piece",
    // Panini: 1–177 and F1–F27 (204 cards), in album order.
    codes: [...range("", 1, 177), ...range("F", 1, 27)],
    /** Human description of the valid codes, for messages (UI copy). */
    codeHelp: "Del 1 al 177, o especiales del F1 al F27.",
  },
} as const satisfies Record<
  string,
  {
    name: string;
    shortName: string;
    blurb: string;
    theme: ThemeId;
    codes: readonly string[];
    codeHelp: string;
  }
>;

export type CollectionSlug = keyof typeof COLLECTIONS;

export const DEFAULT_COLLECTION: CollectionSlug = "rumbo-a-egghead";

export function getCollectionConfig(slug: string) {
  return Object.hasOwn(COLLECTIONS, slug)
    ? COLLECTIONS[slug as CollectionSlug]
    : undefined;
}

const codeSets = new Map<string, ReadonlySet<string>>(
  Object.entries(COLLECTIONS).map(([slug, c]) => [slug, new Set(c.codes)]),
);

/** "f07 " → "F7", "045" → "45". Does not check that the code exists. */
export function normalizeCardCode(input: string): string {
  const match = /^\s*([a-z]*)\s*0*(\d+)\s*$/i.exec(input);
  if (!match) return input.trim().toUpperCase();
  return `${match[1].toUpperCase()}${match[2]}`;
}

/** True if `code` (already normalized) belongs to the collection. */
export function isValidCardCode(slug: string, code: string): boolean {
  return codeSets.get(slug)?.has(code) ?? false;
}

/** Album position of a code (for sorting), or -1 if it does not exist. */
export function cardSortIndex(slug: string, code: string): number {
  const codes: readonly string[] =
    COLLECTIONS[slug as CollectionSlug]?.codes ?? [];
  return codes.indexOf(code);
}

/** Special cards (F1…) get the gold frame. */
export function isSpecialCode(code: string): boolean {
  return /^[A-Z]/.test(code);
}

/**
 * Error message (UI copy) for a typed code, or null if it is valid.
 * Shared by every code input so the wording is the same everywhere.
 */
export function cardCodeError(slug: string, raw: string): string | null {
  const code = normalizeCardCode(raw);
  if (!code) return "Escribe un código.";
  if (isValidCardCode(slug, code)) return null;
  const help = getCollectionConfig(slug)?.codeHelp ?? "";
  return `El ${code} no existe. ${help}`.trim();
}
