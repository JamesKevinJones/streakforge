// POST /functions/v1/sync-activity
// Called by the client whenever it opens the app. Body: { leetcodeContributed?: boolean }.
// GitHub status is always fetched server-side here (app-level token, see
// _shared/github.ts) so the client never needs its own PAT. LeetCode
// status is supplied by the client (it already fetched it in-browser,
// where LeetCode is far less likely to block the request) — this
// function just records what the client reports.
import { createClient } from "npm:@supabase/supabase-js@2.45.4";
import { hasGithubContributionOn } from "../_shared/github.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405 });
  }

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return new Response(JSON.stringify({ error: "Missing Authorization header" }), { status: 401 });
  }

  // Scoped to the caller's own JWT, so RLS + the record_activity ownership
  // check both apply naturally — this function never uses the service role.
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
  });

  const { data: userData, error: userErr } = await supabase.auth.getUser();
  if (userErr || !userData?.user) {
    return new Response(JSON.stringify({ error: "Invalid session" }), { status: 401 });
  }
  const userId = userData.user.id;

  const { data: profile, error: profileErr } = await supabase
    .from("profiles")
    .select("github_username, timezone")
    .eq("user_id", userId)
    .single();

  if (profileErr || !profile) {
    return new Response(JSON.stringify({ error: "Profile not found" }), { status: 404 });
  }

  let body: { leetcodeContributed?: boolean } = {};
  try {
    body = await req.json();
  } catch {
    // no body is fine — LeetCode status just stays unreported this call
  }

  const localDate = todayInTimezone(profile.timezone || "UTC");

  let githubContributed = false;
  let githubError: string | null = null;
  try {
    githubContributed = await hasGithubContributionOn(profile.github_username, localDate);
  } catch (err) {
    githubError = err instanceof Error ? err.message : String(err);
  }

  const leetcodeContributed = !!body.leetcodeContributed;

  const { error: rpcErr } = await supabase.rpc("record_activity", {
    p_user_id: userId,
    p_local_date: localDate,
    p_github: githubContributed,
    p_leetcode: leetcodeContributed,
    p_leetcode_synced: true,
  });

  if (rpcErr) {
    return new Response(JSON.stringify({ error: rpcErr.message }), { status: 500 });
  }

  const { data: streakState } = await supabase
    .from("streak_state")
    .select("*")
    .eq("user_id", userId)
    .single();

  return new Response(
    JSON.stringify({ streak: streakState, githubContributed, leetcodeContributed, githubError }),
    { headers: { "Content-Type": "application/json" } },
  );
});

function todayInTimezone(timeZone: string): string {
  // en-CA formats as YYYY-MM-DD, which matches Postgres `date` input directly.
  return new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" })
    .format(new Date());
}
