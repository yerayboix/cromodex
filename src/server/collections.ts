import "server-only";

import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { cache } from "react";

import { getDb } from "@/db";
import { collections } from "@/db/schema";
import { getCollectionConfig } from "@/lib/collections";

export type CollectionContext = {
  id: string;
  slug: string;
  config: NonNullable<ReturnType<typeof getCollectionConfig>>;
};

/** The collection for a route slug, or a 404. Deduplicated per request. */
export const getCollection = cache(
  async (slug: string): Promise<CollectionContext> => {
    const config = getCollectionConfig(slug);
    if (!config) notFound();
    // Request-time only: never query the database while prerendering
    // (the Docker build has no DATABASE_URL).
    await connection();
    const [row] = await getDb()
      .select({ id: collections.id })
      .from(collections)
      .where(eq(collections.slug, slug))
      .limit(1);
    if (!row) notFound();
    return { id: row.id, slug, config };
  },
);
