import { Button } from "@/components/ui/button";
import { getCurrentUser } from "@/lib/auth";

import { logout } from "./actions";

/** Reads the session: render it behind a <Suspense> boundary. */
export async function UserMenu() {
  const user = await getCurrentUser();

  return (
    <div className="flex items-center gap-3">
      <span className="text-sm text-muted-foreground">{user.displayName}</span>
      <form action={logout}>
        <Button type="submit" variant="outline" size="sm">
          Salir
        </Button>
      </form>
    </div>
  );
}
