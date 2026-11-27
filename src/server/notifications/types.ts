/*
 * Channel-agnostic notification types. See docs/notifications.md.
 */

/** What a member can switch off. */
export type Topic = "trades" | "wanted";

export type Party = "owner" | "offerer";

/** Why an offer stopped (shown to the offerer, or to the owner when rejected). */
export type ClosedReason =
  | "rejected"
  | "owner_left"
  | "listing_traded"
  | "listing_withdrawn"
  | "cards_traded";

/** Something one member should be told, before choosing words or channels. */
export type Notification =
  | {
      kind: "offer.received";
      userId: string;
      slug: string;
      listingId: string;
      code: string;
      cards: string[];
    }
  | {
      kind: "counter.received";
      userId: string;
      /** The recipient's side in the negotiation. */
      role: Party;
      slug: string;
      listingId: string;
      code: string;
      cards: string[];
    }
  | {
      kind: "trade.done";
      userId: string;
      role: Party;
      slug: string;
      tradeId: string;
      otherName: string;
      ownerCard: string;
      offererCards: string[];
    }
  | {
      kind: "offer.closed";
      userId: string;
      role: Party;
      reason: ClosedReason;
      slug: string;
      listingId: string;
      code: string;
    }
  | {
      kind: "wanted.available";
      userId: string;
      slug: string;
      listingId: string;
      code: string;
    };

export type NotificationKind = Notification["kind"];

/** Neutral text every channel sends; channels only format it. */
export type Message = {
  title: string;
  body: string;
  /** Absolute link into the app. */
  url: string;
};

export function topicOf(kind: NotificationKind): Topic {
  return kind === "wanted.available" ? "wanted" : "trades";
}
