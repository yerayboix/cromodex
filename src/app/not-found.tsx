import Link from "next/link";

import { btnGold } from "@/components/ui-classes";

export default function NotFound() {
  return (
    <main className="bg-chart flex min-h-dvh flex-1 flex-col items-center justify-center gap-5 px-6 py-16 text-center">
      <h1 className="font-display text-[28px] leading-tight">No encontramos esta página</h1>
      <p className="max-w-md text-[15px] leading-normal text-muted-table">
        Puede que la carta ya no esté en la mesa o que el enlace esté mal.
      </p>
      <Link href="/" className={btnGold}>
        Ir a la mesa
      </Link>
    </main>
  );
}
