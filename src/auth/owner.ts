import type { PublicAuthClient } from "../lib/supabase";
// Never authorize from the session payload alone: verify with Auth, then the database owner policy.
export async function verifiedOwner(client: PublicAuthClient) {
  const { data, error } = await client.auth.getUser();
  if (error || !data.user || !data.user.email_confirmed_at) return null;
  const profile = await client
    .from("profiles")
    .select("id")
    .eq("id", data.user.id)
    .maybeSingle();
  if (profile.error || !profile.data || profile.data.id !== data.user.id)
    return null;
  return { id: data.user.id, email: data.user.email ?? "" };
}
