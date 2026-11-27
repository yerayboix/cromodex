/** URL builders, so routes are spelled out in one place. */
export const paths = {
  board: (slug: string) => `/c/${slug}`,
  missing: (slug: string) => `/c/${slug}?filter=missing`,
  publish: (slug: string) => `/c/${slug}/publish`,
  card: (slug: string, listingId: string) => `/c/${slug}/cards/${listingId}`,
  offer: (slug: string, listingId: string) => `/c/${slug}/cards/${listingId}/offer`,
  counter: (slug: string, listingId: string, negotiationId: string) =>
    `/c/${slug}/cards/${listingId}/counter/${negotiationId}`,
  trade: (slug: string, tradeId: string) => `/c/${slug}/trades/${tradeId}`,
  myTrades: (slug: string) => `/c/${slug}/trades`,
  wanted: (slug: string) => `/c/${slug}/wanted`,
  log: (slug: string) => `/c/${slug}/log`,
  setPassword: "/set-password",
  welcome: "/set-password?welcome=1",
  expiredLink: "/login?link=expired",
};
