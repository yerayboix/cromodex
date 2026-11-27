/**
 * Panel of a card, next to the board (desktop) or full screen (phones).
 * The board comes from the shared (board) layout and stays mounted.
 */
export default function CardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex w-full flex-col lg:sticky lg:top-0 lg:h-dvh lg:w-[464px] lg:shrink-0 lg:overflow-y-auto lg:bg-parchment lg:shadow-[-8px_0_0_rgb(4_22_33/0.35)]">
      {children}
    </div>
  );
}
