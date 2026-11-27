import { HandCard } from "@/components/cards";
import { CompassRose } from "@/components/icons";

/**
 * Layout of the screens outside the app (login, choosing a password).
 * Phones: cards, name and form stacked. Desktop: table left, form right.
 */
export function AuthFrame({
  title,
  children,
}: {
  /** Desktop heading of the form panel. */
  title: string;
  children: React.ReactNode;
}) {
  return (
    <main className="bg-chart flex min-h-dvh flex-1 flex-col justify-center gap-7 px-5 py-6 lg:flex-row lg:gap-0 lg:p-0">
      <section className="relative flex flex-col items-center justify-center gap-7 overflow-hidden lg:flex-1 lg:items-start lg:gap-10 lg:px-20 lg:py-16">
        <CompassRose className="pointer-events-none absolute -right-36 -bottom-40 hidden size-[460px] text-parchment opacity-[0.07] lg:block" />
        <div aria-hidden="true" className="flex h-[120px] items-end lg:h-[220px]">
          <Fanned />
        </div>
        <div className="flex flex-col items-center gap-2 text-center lg:max-w-[560px] lg:items-start lg:gap-3 lg:text-left">
          <p className="font-display text-[40px] leading-none lg:text-7xl lg:leading-[0.95]">
            cromodex
          </p>
          <p className="text-base leading-[1.45] text-muted-table lg:text-xl">
            Cambia tus cromos repetidos con el grupo.
            <span className="hidden lg:inline">
              {" "}
              Las cartas van a la mesa sin nombre; los nombres solo salen cuando se
              cierra un trato.
            </span>
          </p>
        </div>
      </section>
      <section className="rounded-[18px] bg-parchment p-5 text-ink lg:flex lg:w-[520px] lg:shrink-0 lg:flex-col lg:justify-center lg:rounded-none lg:px-14 lg:py-16 lg:shadow-[-8px_0_0_rgb(4_22_33/0.35)]">
        <h1 className="mb-4 font-display text-2xl leading-tight lg:mb-5 lg:text-[32px]">
          {title}
        </h1>
        {children}
      </section>
    </main>
  );
}

function Fanned() {
  const big = "[&>span]:lg:h-[168px] [&>span]:lg:w-[120px] [&>span]:lg:text-[28px]";
  return (
    <>
      <HandCard code="1" className={`frame-regular -mr-[18px] -rotate-10 lg:-mr-[30px] ${big}`} />
      <HandCard code="F1" className={`relative z-[1] mb-2.5 lg:mb-[22px] ${big}`} />
      <HandCard code="177" className={`frame-regular relative z-[2] -ml-[18px] rotate-10 lg:-ml-[30px] ${big}`} />
    </>
  );
}
