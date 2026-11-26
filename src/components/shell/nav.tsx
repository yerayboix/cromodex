"use client";

import { cn } from "cn";
import { Bookmark, Search } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { BoardIcon, TradesIcon } from "@/components/icons";
import { paths } from "@/lib/paths";

type Section = "board" | "trades" | "wanted" | "log";

function sectionOf(pathname: string, slug: string): Section | null {
  const base = paths.board(slug);
  if (pathname === base) return "board";
  if (pathname.startsWith(paths.myTrades(slug))) return "trades";
  if (pathname.startsWith(paths.wanted(slug))) return "wanted";
  if (pathname.startsWith(paths.log(slug))) return "log";
  return null;
}

const ITEMS = [
  { key: "board", label: "Mesa", href: paths.board, Icon: BoardIcon },
  { key: "trades", label: "Mis tratos", href: paths.myTrades, Icon: TradesIcon },
  { key: "wanted", label: "Buscadas", href: paths.wanted, Icon: Search },
  { key: "log", label: "Registro", href: paths.log, Icon: Bookmark },
] as const;

/** Vertical section list in the desktop sidebar. */
export function SideNav({ slug, badge }: { slug: string; badge: React.ReactNode }) {
  const active = sectionOf(usePathname(), slug);
  return (
    <nav aria-label="Secciones" className="flex flex-col gap-1">
      {ITEMS.map(({ key, label, href, Icon }) => (
        <Link
          key={key}
          href={href(slug)}
          aria-current={active === key ? "page" : undefined}
          className={cn(
            "flex h-[46px] items-center gap-3 rounded-[10px] px-3 text-[15px]",
            active === key
              ? "bg-parchment/9 font-extrabold text-gold"
              : "font-semibold text-muted-table hover:bg-parchment/5 hover:text-parchment",
          )}
        >
          <Icon className="size-[22px]" />
          {label}
          {key === "trades" && <span className="ml-auto">{badge}</span>}
        </Link>
      ))}
    </nav>
  );
}

/**
 * Bottom tab bar on phones. Hidden on full-screen flows (a card, publishing,
 * a finished trade), which have their own way back.
 */
export function BottomNav({ slug, badge }: { slug: string; badge: React.ReactNode }) {
  const pathname = usePathname();
  const active = sectionOf(pathname, slug);
  if (active === null) return null;
  return (
    <nav
      aria-label="Secciones"
      className="fixed inset-x-0 bottom-0 z-20 grid h-[76px] grid-cols-4 bg-nav px-2 pt-2 pb-3.5 lg:hidden"
    >
      {ITEMS.map(({ key, label, href, Icon }) => (
        <Link
          key={key}
          href={href(slug)}
          aria-current={active === key ? "page" : undefined}
          className={cn(
            "relative flex flex-col items-center justify-center gap-1 text-xs",
            active === key ? "font-extrabold text-gold" : "font-semibold text-muted-table",
          )}
        >
          <Icon className="size-6" />
          {label}
          {key === "trades" && <span className="absolute top-0.5 left-[54%]">{badge}</span>}
        </Link>
      ))}
    </nav>
  );
}
