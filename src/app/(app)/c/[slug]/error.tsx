"use client";

import { btnGold } from "@/components/ui-classes";

/** Unexpected failure inside a collection (business-rule errors are shown inline). */
export default function CollectionError({ reset }: { error: Error; reset: () => void }) {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-5 px-6 py-16 text-center">
      <h1 className="font-display text-[28px] leading-tight">Algo ha fallado</h1>
      <p className="max-w-md text-[15px] leading-normal text-muted-table">
        No hemos podido cargar esta pantalla. Si estabas cerrando un trato, no se ha
        hecho ningún cambio a medias. Vuelve a intentarlo.
      </p>
      <button type="button" onClick={reset} className={btnGold}>
        Reintentar
      </button>
    </main>
  );
}
