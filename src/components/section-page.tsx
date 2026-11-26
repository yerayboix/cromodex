import { TableWatermark } from "@/components/board";

/** Page frame of the sections (Mis tratos, Buscadas, Registro). */
export function SectionPage({
  title,
  intro,
  children,
}: {
  title: string;
  intro: string;
  children: React.ReactNode;
}) {
  return (
    <main className="relative flex flex-1 flex-col overflow-hidden pb-24 lg:pb-10">
      <TableWatermark />
      <div className="relative flex flex-col gap-3.5 px-4 pt-4.5 lg:gap-7 lg:px-9 lg:pt-7.5">
        <header className="flex flex-col gap-1 px-0.5 lg:gap-1.5 lg:px-0">
          <h1 className="font-display text-[28px] leading-none lg:text-[34px]">{title}</h1>
          <p className="text-sm leading-snug text-muted-table lg:text-[15px]">{intro}</p>
        </header>
        {children}
      </div>
    </main>
  );
}

export function SectionSkeleton() {
  return (
    <div aria-label="Cargando" className="flex flex-col gap-2">
      {Array.from({ length: 3 }, (_, i) => (
        <div key={i} className="h-[72px] animate-pulse rounded-xl bg-parchment/10" />
      ))}
    </div>
  );
}
