-- Create an app.profiles row whenever a user is created in Supabase Auth.
-- Display name: user metadata "display_name" if set, otherwise the email's
-- local part. It can be edited later.
CREATE FUNCTION app.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  INSERT INTO app.profiles (id, display_name)
  VALUES (
    NEW.id,
    coalesce(
      nullif(trim(NEW.raw_user_meta_data ->> 'display_name'), ''),
      split_part(NEW.email, '@', 1)
    )
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;
--> statement-breakpoint
REVOKE EXECUTE ON FUNCTION app.handle_new_user() FROM PUBLIC;
--> statement-breakpoint
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION app.handle_new_user();
--> statement-breakpoint
-- Backfill users that already exist.
INSERT INTO app.profiles (id, display_name)
SELECT
  u.id,
  coalesce(
    nullif(trim(u.raw_user_meta_data ->> 'display_name'), ''),
    split_part(u.email, '@', 1)
  )
FROM auth.users u
ON CONFLICT (id) DO NOTHING;
--> statement-breakpoint
-- The app schema is never reachable from the Data API roles.
REVOKE ALL ON SCHEMA app FROM anon, authenticated;
