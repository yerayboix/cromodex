# Requirements — cromodex

An **anonymous** sticker-trading board for a closed group of users. It is not a collection manager: each user lists the cards they want to trade and offers are negotiated blindly until a deal is accepted.

## 1. Users and access

- Closed group of **6 users**, with login. No public sign-up.
- All activity (listings, offers, wanted cards) is **anonymous** to the other users.
- Identity is revealed only in **accepted trades**.
- The administrator (database owner) can see everything; the group trusts them. Anonymity is not required at a technical level against the admin.

## 2. Collections

- Everything belongs to a **collection**. For now there is only *One Piece — Rumbo a Egghead* (Panini): stickers `1`–`177` and `F1`–`F27`.
- The model must allow adding collections in the future without structural changes.
- The list of valid codes for each collection is **defined in the app's code** (it is official and fixed); typed codes are validated against it.

## 3. Listings (board)

- A user lists a **card code**, saying how many copies they have.
- **Each copy is an independent listing** with its own lifecycle: listing 3 copies creates 3 listings that are negotiated, accepted or withdrawn separately.
- The board shows every active listing in the collection, **with no visible author**.
- When a deal is accepted on a listing, the listing **disappears** from the board.
- The author can **withdraw** their listing at any time; open negotiations on it are cancelled.

## 4. Negotiations

- Any user (except the author) can open a **negotiation** on a listing by offering one or more card codes: *"I'll give you 45 and F12 for your 88"*.
- The author always gives **one copy of the listed card**; that side never changes.
- A negotiation proceeds in **turns**: each turn is a proposal with the list of codes the offerer gives.
  - The author can **counter-offer** asking for another combination of codes: *"OK, but add 15"*.
  - The offerer can reply with another proposal.
  - Whoever receives the latest proposal can **accept** it, **counter** it, or **reject** the whole negotiation.
- **Codes only**: no chat, no free text.
- There is **no check** that the offerer owns the cards they offer.
- An offer **may repeat codes** (e.g. *45 + 45*); it is up to the receiver.
- There can be **several open negotiations** on the same listing.
- **All negotiations are visible to everyone** (so offers can be improved), but they are **untraceable**:
  - Each negotiation has its **own alias** (e.g. *Oferta A*, *Oferta B*), unique within its listing.
  - It is impossible to tell whether two negotiations belong to the same person.
- Until a deal is accepted, either party can **withdraw** (cancel the negotiation).
- **Rejected or cancelled** negotiations disappear: they are not kept in the log.

## 5. Accepting a deal

- Before accepting, an **explicit warning** is shown (UI copy, in Spanish):
  > **ESTA ACCIÓN NO SE PUEDE DESHACER.** Al aceptar se revelará públicamente quiénes participan en el intercambio.
  >
  > *(This action cannot be undone. Accepting will publicly reveal who takes part in the trade.)*
- On accept:
  1. The trade is **closed and final**.
  2. The listing becomes **traded** and disappears from the board; its other open negotiations are cancelled.
  3. **Conflicting offers are cancelled:** any other open negotiation in which **the offerer of the accepted deal** is offering **any of the codes** they just handed over is cancelled automatically.
  4. The trade is logged with the names of both participants.

## 6. Trade log

- Public to all users.
- Shows only **accepted** trades, **with names**: *"Pepe ⇄ Laura — 88 for 45 + 15"*, with date.
- Ongoing negotiations do not appear in the log (they are visible, anonymously, on the board).

## 7. Wanted cards

- Each user keeps a list of the **codes they are looking for**.
- Everyone sees the **aggregated list** (e.g. *"F7 — wanted by 2"*), without knowing who wants it.

## 8. Notifications (later phase)

- Out of the initial scope. Candidate: a Telegram channel or bot.
- Architecture requirement: every relevant action (listing, offer, counter-offer, acceptance, cancellation) emits a persisted **domain event**, so adding a notification channel means plugging in a consumer without touching business logic.

## 9. Out of scope (for now)

- Personal collection management (have / missing / duplicates).
- Sticker photos.
- Statistics.
- Chat or text messages.
- Checking that users own the cards they offer.
