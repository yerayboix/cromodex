import { Suspense } from "react";

import { getCurrentUser } from "@/lib/auth";

export default function HomePage() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-2 text-center">
      <Suspense fallback={<h1 className="text-2xl font-semibold">Hola</h1>}>
        <Greeting />
      </Suspense>
      <p className="text-muted-foreground">Aquí irá el tablón de intercambios.</p>
    </main>
  );
}

async function Greeting() {
  const user = await getCurrentUser();
  return <h1 className="text-2xl font-semibold">Hola, {user.displayName}</h1>;
}
