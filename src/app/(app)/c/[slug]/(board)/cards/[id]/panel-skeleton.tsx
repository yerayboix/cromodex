import { CardPanel } from "./panel";

/*
 * Placeholders shaped like the card panel, shown while a card or a composer
 * loads. Light shapes on the table-coloured head, darker ones on parchment.
 */

const onTable = "animate-pulse rounded-md bg-parchment/15";
const onParchment = "animate-pulse rounded-md bg-ink/8";

function HeadSkeleton({ composer = false }: { composer?: boolean }) {
  return (
    <>
      <div className="flex h-11 items-center px-2 lg:h-10 lg:px-0">
        <span className={`${onTable} h-5 w-16 lg:w-6`} />
        {composer && <span className={`${onTable} ml-3 h-6 w-56`} />}
      </div>
      {composer ? (
        <div className="flex items-center justify-center gap-6 px-3.5 py-2 lg:px-0">
          <span className={`${onTable} h-[130px] w-[92px] rounded-xl`} />
          <span className={`${onTable} h-[92px] w-[66px] rounded-lg`} />
        </div>
      ) : (
        <div className="flex items-end gap-4 px-3.5 lg:gap-4.5 lg:px-0">
          <span className={`${onTable} h-[158px] w-[112px] shrink-0 -rotate-2 rounded-xl`} />
          <div className="flex flex-1 flex-col gap-2.5 pb-1">
            <span className={`${onTable} h-7 w-36`} />
            <span className={`${onTable} h-3.5 w-full max-w-56`} />
            <span className={`${onTable} h-3.5 w-40`} />
          </div>
        </div>
      )}
    </>
  );
}

function OfferSkeleton() {
  return (
    <div className="flex flex-col gap-3 rounded-[14px] border border-line bg-panel-2 px-3.5 py-3">
      <div className="flex items-center justify-between">
        <span className={`${onParchment} h-4 w-24`} />
        <span className={`${onParchment} h-4 w-28`} />
      </div>
      <div className="flex items-center gap-2">
        <span className={`${onParchment} h-3.5 w-12`} />
        <span className={`${onParchment} h-[50px] w-10`} />
        <span className={`${onParchment} h-[50px] w-10`} />
      </div>
    </div>
  );
}

/** While a card and its offers load. */
export function PanelSkeleton() {
  return (
    <div role="status" aria-label="Cargando la carta" className="flex flex-1 flex-col">
      <CardPanel head={<HeadSkeleton />}>
        <span className={`${onParchment} mx-1 h-5 w-24`} />
        <OfferSkeleton />
        <OfferSkeleton />
      </CardPanel>
    </div>
  );
}

/** While the offer or counter-offer composer loads. */
export function ComposerSkeleton() {
  return (
    <div role="status" aria-label="Cargando" className="flex flex-1 flex-col">
      <CardPanel head={<HeadSkeleton composer />}>
        <span className={`${onParchment} h-4 w-32`} />
        <span className={`${onParchment} h-[52px] w-full rounded-[10px]`} />
        <span className={`${onParchment} mt-auto h-[54px] w-full rounded-xl`} />
      </CardPanel>
    </div>
  );
}
