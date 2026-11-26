import { redirect } from "next/navigation";

import { DEFAULT_COLLECTION } from "@/lib/collections";
import { paths } from "@/lib/paths";

/** The app opens on the default collection's board. */
export default function HomePage() {
  redirect(paths.board(DEFAULT_COLLECTION));
}
