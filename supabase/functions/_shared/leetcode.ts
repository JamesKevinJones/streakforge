// Best-effort, non-blocking LeetCode lookup for the scheduled job only.
// LeetCode has no official API and no auth; a request from a cloud
// provider's datacenter IP is materially more likely to be Cloudflare-
// blocked than a browser request. The client remains the primary source
// (see sync-activity) — this is only a fallback for days nobody opened
// the app, and every caller MUST treat a thrown error as "unknown", not
// "not contributed" (never let this fail the rest of a user's check).

export async function tryFetchLeetCodeContributedOn(
  username: string,
  localDate: string,
): Promise<boolean | null> {
  if (!username) return null;

  const query = `query($username: String!) {
    matchedUser(username: $username) { submissionCalendar }
  }`;

  try {
    const res = await fetch("https://leetcode.com/graphql", {
      method: "POST",
      headers: { "Content-Type": "application/json", Referer: "https://leetcode.com" },
      body: JSON.stringify({ query, variables: { username } }),
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return null;

    const data = await res.json();
    const calendarStr = data?.data?.matchedUser?.submissionCalendar;
    if (!calendarStr) return null;

    const calendar = JSON.parse(calendarStr) as Record<string, number>;
    for (const [epochSec, count] of Object.entries(calendar)) {
      if (count > 0) {
        const date = new Date(parseInt(epochSec, 10) * 1000).toISOString().split("T")[0];
        if (date === localDate) return true;
      }
    }
    return false;
  } catch {
    // Blocked, timed out, or shape changed — genuinely unknown, not "false".
    return null;
  }
}
