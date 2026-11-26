import type { Metadata } from "next";

export const metadata: Metadata = { title: "Mesa" };

/** The board itself lives in the shared layout; this route adds no panel. */
export default function BoardPage() {
  return null;
}
