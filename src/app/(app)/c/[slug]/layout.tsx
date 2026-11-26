import { Plus } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { CollectionMenu } from "@/components/shell/collection-menu";
import { AutoRefresh } from "@/components/shell/auto-refresh";
import { BottomNav, SideNav } from "@/components/shell/nav";
import { AccountSlot, TurnBadge } from "@/components/shell/server-slots";
import { btnGold } from "@/components/ui-classes";
import { COLLECTIONS, getCollectionConfig } from "@/lib/collections";
import { paths } from "@/lib/paths";

// The shell needs the collection (theme, links) before anything renders, so
// this segment may block on its params. Content below streams in Suspense.
export const instant = false;

export function generateStaticParams() {
  return Object.keys(COLLECTIONS).map((slug) => ({ slug }));
}

/**
 * Collection shell: applies the collection's theme, a sidebar on desktop
 * and a bottom tab bar on phones.
 */
export default async function CollectionLayout({
  children,
  params,
}: LayoutProps<"/c/[slug]">) {
  const { slug } = await params;
  const collection = getCollectionConfig(slug);
  if (!collection) notFound();

  return (
    <div
      data-theme={collection.theme}
      className="flex min-h-dvh flex-1 bg-nav font-body text-parchment"
    >
      <aside className="sticky top-0 hidden h-dvh w-[248px] shrink-0 flex-col gap-5.5 bg-nav px-4 pt-6 pb-5 lg:flex">
        <div className="flex flex-col gap-1 px-1.5">
          <span className="text-[13px] font-bold text-muted-table">cromodex</span>
          <CollectionMenu slug={slug} className="text-[18px] whitespace-nowrap" />
        </div>
        <Link href={paths.publish(slug)} className={`${btnGold} h-12 text-[15px]`}>
          <Plus className="size-[18px]" strokeWidth={2.6} />
          Publicar carta
        </Link>
        {/* usePathname is request data on dynamic routes: stream it in. */}
        <Suspense fallback={<div className="h-[196px]" />}>
          <SideNav
            slug={slug}
            badge={
              <Suspense fallback={null}>
                <TurnBadge slug={slug} variant="pill" />
              </Suspense>
            }
          />
        </Suspense>
        <div className="mt-auto">
          <Suspense fallback={<div className="h-[60px]" />}>
            <AccountSlot variant="sidebar" />
          </Suspense>
        </div>
      </aside>

      <div className="bg-chart relative flex min-w-0 flex-1 flex-col">{children}</div>

      <Suspense fallback={null}>
        <BottomNav
          slug={slug}
          badge={
            <Suspense fallback={null}>
              <TurnBadge slug={slug} variant="dot" />
            </Suspense>
          }
        />
      </Suspense>
      <AutoRefresh />
    </div>
  );
}
