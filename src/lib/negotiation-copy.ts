/**
 * Wording of a negotiation from the viewer's side (UI copy). Kept in one
 * place so the card panel and "Mis tratos" say the same thing.
 */

type Party = "owner" | "offerer";

export type NegotiationLike = {
  alias: string;
  myRole: Party | null;
  turn: Party;
  myTurn: boolean;
  lastBy: Party;
};

export function negotiationTitle(n: NegotiationLike) {
  return n.myRole === "offerer" ? `Tu oferta (${n.alias})` : `Oferta ${n.alias}`;
}

/** Status shown when it is not the viewer's turn. */
export function waitingLabel(n: NegotiationLike) {
  if (n.myRole === "owner") return "Esperando su respuesta";
  if (n.turn === "owner") return "Esperando al dueño";
  return "Esperando a quien ofertó";
}

/** Verb in front of the cards of the current proposal. */
export function proposalLead(n: NegotiationLike) {
  if (n.myRole === "owner") return n.lastBy === "offerer" ? "Te da" : "Le pediste";
  if (n.myRole === "offerer") return n.lastBy === "owner" ? "Te piden" : "Ofreces";
  return n.lastBy === "offerer" ? "Ofrece" : "El dueño pide";
}
