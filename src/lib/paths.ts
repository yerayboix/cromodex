/** URL builders, so routes are spelled out in one place. */
export const paths = {
  board: (slug: string) => `/c/${slug}`,
  missing: (slug: string) => `/c/${slug}?filtro=faltan`,
  publish: (slug: string) => `/c/${slug}/publicar`,
  card: (slug: string, listingId: string) => `/c/${slug}/carta/${listingId}`,
  offer: (slug: string, listingId: string) => `/c/${slug}/carta/${listingId}/ofertar`,
  counter: (slug: string, listingId: string, negotiationId: string) =>
    `/c/${slug}/carta/${listingId}/contraoferta/${negotiationId}`,
  trade: (slug: string, tradeId: string) => `/c/${slug}/trato/${tradeId}`,
  myTrades: (slug: string) => `/c/${slug}/tratos`,
  wanted: (slug: string) => `/c/${slug}/buscadas`,
  log: (slug: string) => `/c/${slug}/registro`,
};
