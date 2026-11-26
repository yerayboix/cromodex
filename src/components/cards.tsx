import { cn } from "cn";

import { isSpecialCode } from "@/lib/collections";

/*
 * Card pieces of the theme. Each copy on the table is a card with a frame
 * (wood for regular codes, gold for specials) and a parchment face. Photos
 * are out of scope for now, so the picture area shows the code on lined
 * paper; the layout already leaves room for an image.
 */

function frameClass(code: string) {
  return isSpecialCode(code) ? "frame-special" : "frame-regular";
}

/** Full card with picture area and code, e.g. the card in a detail header. */
export function BigCard({
  code,
  className,
  size = "md",
}: {
  code: string;
  className?: string;
  size?: "sm" | "md" | "lg";
}) {
  const dims = {
    sm: "w-[78px] [--h:104px] text-[15px]",
    md: "w-[112px] [--h:152px] text-xl",
    lg: "w-[132px] [--h:180px] text-[22px]",
  }[size];
  return (
    <div
      className={cn(
        "shrink-0 rounded-xl p-[3px] shadow-card",
        frameClass(code),
        dims,
        className,
      )}
      style={frameDelay(code)}
    >
      <div className="flex h-(--h) flex-col gap-[5px] rounded-[9px] bg-parchment p-[5px] text-ink">
        <div className="bg-card-blank flex min-h-0 flex-1 items-center justify-center overflow-hidden rounded-[5px]">
          <span
            aria-hidden="true"
            className="font-display text-[1.75em] text-[#d0bc93]"
          >
            {code}
          </span>
        </div>
        <span className="px-0.5 font-display leading-none">{code}</span>
      </div>
    </div>
  );
}

/** Card held in hand: only the code, as in offers and trades. */
export function HandCard({
  code,
  className,
  size = "md",
  isNew = false,
}: {
  code: string;
  className?: string;
  size?: "sm" | "md" | "lg";
  /** Added in this counter-offer: highlighted frame. */
  isNew?: boolean;
}) {
  const dims = {
    sm: "w-[54px] h-[76px] text-base",
    md: "w-[66px] h-[92px] text-[19px]",
    lg: "w-[96px] h-[134px] text-2xl",
  }[size];
  return (
    <span
      className={cn(
        "inline-block shrink-0 rounded-lg p-0.5 shadow-card",
        isNew ? "bg-gold" : isSpecialCode(code) ? "frame-special" : "bg-wood",
        className,
      )}
      style={frameDelay(code)}
    >
      <span
        className={cn(
          "flex items-end rounded-md bg-parchment p-1.5 font-display leading-none text-ink",
          dims,
        )}
      >
        {code}
      </span>
    </span>
  );
}

/** Small card chip used in lists. */
export function MiniCard({
  code,
  className,
  size = "md",
}: {
  code: string;
  className?: string;
  size?: "sm" | "md";
}) {
  return (
    <span
      className={cn(
        "inline-block shrink-0 rounded-[5px] p-0.5",
        isSpecialCode(code) ? "frame-special" : "bg-wood",
        className,
      )}
      style={frameDelay(code)}
    >
      <span
        className={cn(
          "flex items-end justify-center rounded-[3px] bg-parchment pb-1 font-display leading-none text-ink",
          size === "md" ? "h-[46px] w-9 text-[15px]" : "h-[42px] w-8 text-sm",
        )}
      >
        {code}
      </span>
    </span>
  );
}

/** A row of mini cards. */
export function MiniCards({ codes }: { codes: string[] }) {
  return (
    <span className="flex flex-wrap items-center gap-1.5">
      {codes.map((c, i) => (
        <MiniCard key={`${c}-${i}`} code={c} />
      ))}
    </span>
  );
}

/** "45", "45 y 15", "45, 15 y F12" (UI copy). */
export function joinCodes(codes: string[]): string {
  if (codes.length <= 1) return codes.join("");
  return `${codes.slice(0, -1).join(", ")} y ${codes.at(-1)}`;
}

/**
 * Start offset of the special frame animation, stable per seed (a listing id
 * or a code), so cards on the same table do not turn in sync.
 */
export function frameDelay(seed: string): React.CSSProperties {
  let h = 0;
  for (const ch of seed) h = (h * 31 + ch.charCodeAt(0)) % 997;
  return { "--frame-delay": `-${(h % 30) / 10}s` } as React.CSSProperties;
}
