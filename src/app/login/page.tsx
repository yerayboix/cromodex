import type { Metadata } from "next";

import { HandCard } from "@/components/cards";
import { CompassRose } from "@/components/icons";

import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Entrar" };

/** Phones: cards, name and form stacked. Desktop: table left, form right. */
export default function LoginPage() {
  return (
    <main className="bg-chart flex min-h-dvh flex-1 flex-col justify-center gap-7 px-5 py-6 lg:flex-row lg:gap-0 lg:p-0">
      <section className="relative flex flex-col items-center justify-center gap-7 overflow-hidden lg:flex-1 lg:items-start lg:gap-10 lg:px-20 lg:py-16">
        <CompassRose className="pointer-events-none absolute -right-36 -bottom-40 hidden size-[460px] text-parchment opacity-[0.07] lg:block" />
        <div aria-hidden="true" className="flex h-[120px] items-end lg:h-[220px]">
          <Fanned />
        </div>
        <div className="flex flex-col items-center gap-2 text-center lg:max-w-[560px] lg:items-start lg:gap-3 lg:text-left">
          <h1 className="font-display text-[40px] leading-none lg:text-7xl lg:leading-[0.95]">
            cromodex
          </h1>
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
        <h2 className="mb-5 hidden font-display text-[32px] leading-tight lg:block">Entrar</h2>
        <LoginForm />
      </section>
    </main>
  );
}

function Fanned() {
  return (
    <>
      <HandCard code="1" className="frame-regular -mr-[18px] -rotate-10 lg:-mr-[30px] [&>span]:lg:h-[168px] [&>span]:lg:w-[120px] [&>span]:lg:text-[28px]" />
      <HandCard code="F1" className="relative z-[1] mb-2.5 lg:mb-[22px] [&>span]:lg:h-[168px] [&>span]:lg:w-[120px] [&>span]:lg:text-[28px]" />
      <HandCard code="177" className="frame-regular relative z-[2] -ml-[18px] rotate-10 lg:-ml-[30px] [&>span]:lg:h-[168px] [&>span]:lg:w-[120px] [&>span]:lg:text-[28px]" />
    </>
  );
}
