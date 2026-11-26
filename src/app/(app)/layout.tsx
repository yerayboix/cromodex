import { Suspense } from "react";

import { UserMenu } from "./user-menu";

/** Shell for every signed-in page. The proxy keeps signed-out users out. */
export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-1 flex-col">
      <header className="flex h-14 items-center justify-between border-b px-4">
        <span className="font-semibold tracking-tight">cromodex</span>
        <Suspense fallback={null}>
          <UserMenu />
        </Suspense>
      </header>
      <div className="flex flex-1 flex-col p-4">{children}</div>
    </div>
  );
}
