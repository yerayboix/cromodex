// Creates the test users of the LOCAL Supabase stack (never the cloud one).
// Run through `npm run local:seed`. Passwords are local test values only.
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
if (!/^http:\/\/(127\.0\.0\.1|localhost)(:\d+)?$/.test(url)) {
  throw new Error(`Refusing to seed a non-local Supabase: ${url}`);
}

export const TEST_USERS = [
  { email: "ana@cromodex.test", password: "cromodex-local-1", displayName: "Ana" },
  { email: "marcos@cromodex.test", password: "cromodex-local-2", displayName: "Marcos" },
  { email: "laura@cromodex.test", password: "cromodex-local-3", displayName: "Laura" },
];

const admin = createClient(url, process.env.SUPABASE_SECRET_KEY, {
  auth: { persistSession: false },
});

for (const u of TEST_USERS) {
  const { error } = await admin.auth.admin.createUser({
    email: u.email,
    password: u.password,
    email_confirm: true,
    user_metadata: { display_name: u.displayName },
  });
  if (error && !/already/i.test(error.message)) throw error;
  console.log(error ? `exists  ${u.email}` : `created ${u.email}`);
}
