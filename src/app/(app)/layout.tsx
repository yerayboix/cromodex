/** Signed-in area. The proxy keeps signed-out users out. */
export default function AppLayout({ children }: { children: React.ReactNode }) {
  return <div className="flex flex-1 flex-col">{children}</div>;
}
