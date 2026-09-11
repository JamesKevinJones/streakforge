// Browser-side LeetCode fetch, kept client-primary per docs/DECISIONS.md:
// a request from an ordinary browser is far less likely to be Cloudflare-
// blocked than one from a cloud provider's datacenter IP, so this stays
// the primary source of truth and the server only attempts a best-effort
// fallback for days nobody opened the app.
export async function fetchLeetCodeContributedToday(username) {
  if (!username) return false;

  const query = `query($username: String!) {
    matchedUser(username: $username) { submissionCalendar }
  }`;

  let data;
  try {
    const res = await fetch('https://leetcode.com/graphql', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Referer: 'https://leetcode.com' },
      body: JSON.stringify({ query, variables: { username } }),
    });
    if (!res.ok) throw new Error('direct request failed');
    data = await res.json();
  } catch {
    const res = await fetch('https://corsproxy.io/?https://leetcode.com/graphql', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, variables: { username } }),
    });
    if (!res.ok) throw new Error(`LeetCode API error: ${res.status}`);
    data = await res.json();
  }

  if (data.errors) {
    throw new Error(`LeetCode error: ${data.errors.map((e) => e.message).join(', ')}`);
  }

  const calendarStr = data.data?.matchedUser?.submissionCalendar;
  if (!calendarStr) return false;

  const calendar = JSON.parse(calendarStr);
  const today = new Date().toISOString().split('T')[0];
  for (const [epochSec, count] of Object.entries(calendar)) {
    if (count > 0) {
      const date = new Date(parseInt(epochSec, 10) * 1000).toISOString().split('T')[0];
      if (date === today) return true;
    }
  }
  return false;
}
