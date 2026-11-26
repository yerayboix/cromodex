/**
 * Card lists per collection, keyed by `app.collections.slug`.
 * Pure module: safe to import from client and server code alike.
 */

function range(prefix: string, from: number, to: number): string[] {
  return Array.from({ length: to - from + 1 }, (_, i) => `${prefix}${from + i}`);
}

export const COLLECTIONS = {
  "rumbo-a-egghead": {
    name: "One Piece — Rumbo a Egghead",
    // Panini: 1–177 and F1–F27 (204 cards), in album order.
    codes: [...range("", 1, 177), ...range("F", 1, 27)],
  },
} as const satisfies Record<string, { name: string; codes: readonly string[] }>;

export type CollectionSlug = keyof typeof COLLECTIONS;

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
