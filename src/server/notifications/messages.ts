import { paths } from "@/lib/paths";

import type { ClosedReason, Message, Notification } from "./types";

/*
 * Words of every notification (UI copy, Spanish). Channel-agnostic: each
 * channel formats the same title, body and link. Never names who offers or
 * who owns a card; names only appear in "trade done", as in the trade log.
 */

/** Public base URL of the app, for links in messages. */
export function appUrl(): string {
  return (process.env.APP_URL ?? "http://localhost:3000").replace(/\/+$/, "");
}

/** "a", "a y b", "a, b y c". */
function list(words: string[]): string {
  if (words.length <= 1) return words.join("");
  return `${words.slice(0, -1).join(", ")} y ${words.at(-1)}`;
}

const CLOSED: Record<ClosedReason, string> = {
  rejected: "la han rechazado",
  owner_left: "el dueño se ha retirado",
  listing_traded: "la carta se ha cambiado con otra persona",
  listing_withdrawn: "el dueño ha retirado la carta",
  cards_traded: "ya has dado esas cartas en otro trato",
};

export function renderMessage(n: Notification): Message {
  const base = appUrl();
  switch (n.kind) {
    case "offer.received":
      return {
        title: `Nueva oferta por tu ${n.code}`,
        body: `Te dan ${list(n.cards)}.`,
        url: base + paths.card(n.slug, n.listingId),
      };
    case "counter.received":
      return n.role === "offerer"
        ? {
            title: `Te han contraofertado en el ${n.code}`,
            body: `Te piden ${list(n.cards)}.`,
            url: base + paths.card(n.slug, n.listingId),
          }
        : {
            title: `Nueva contraoferta por tu ${n.code}`,
            body: `Ahora te dan ${list(n.cards)}.`,
            url: base + paths.card(n.slug, n.listingId),
          };
    case "trade.done":
      return {
        title: "Trato hecho",
        body:
          n.role === "owner"
            ? `Has cambiado tu ${n.ownerCard} por ${list(n.offererCards.map((c) => `el ${c}`))} de ${n.otherName}.`
            : `Has cambiado ${list(n.offererCards.map((c) => `tu ${c}`))} por el ${n.ownerCard} de ${n.otherName}.`,
        url: base + paths.trade(n.slug, n.tradeId),
      };
    case "offer.closed":
      return n.role === "owner"
        ? {
            title: `Una oferta por tu ${n.code} se ha cerrado`,
            body: "Han rechazado tu contraoferta.",
            url: base + paths.card(n.slug, n.listingId),
          }
        : {
            title: `Tu oferta por el ${n.code} ya no sigue`,
            body: `${capitalize(CLOSED[n.reason])}.`,
            url: base + paths.board(n.slug),
          };
    case "wanted.available":
      return {
        title: `Ha llegado a la mesa una carta que buscas: ${n.code}`,
        body: "Nadie sabe que la buscas tú.",
        url: base + paths.card(n.slug, n.listingId),
      };
  }
}

/** Several "wanted" notices for one member, merged into one message. */
export function renderWantedBatch(
  items: { code: string; url: string }[],
  slug: string,
): Message {
  if (items.length === 1) {
    return {
      title: `Ha llegado a la mesa una carta que buscas: ${items[0].code}`,
      body: "Nadie sabe que la buscas tú.",
      url: items[0].url,
    };
  }
  const codes = [...new Set(items.map((i) => i.code))];
  return {
    title: `Han llegado a la mesa cartas que buscas: ${list(codes)}`,
    body: "Míralas con el filtro «Me faltan».",
    url: appUrl() + paths.missing(slug),
  };
}

function capitalize(text: string) {
  return text.charAt(0).toUpperCase() + text.slice(1);
}
