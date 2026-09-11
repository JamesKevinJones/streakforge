// Server-side GitHub contribution lookup, shared by sync-activity (client-
// triggered) and daily-streak-check (cron-triggered). Uses a single
// app-level PAT (GITHUB_APP_TOKEN secret) — GitHub's contribution
// calendar is the same data publicly shown on a user's profile page, so
// any authenticated token can query it for any username. This is why
// end users never need to paste their own token (see docs/DECISIONS.md).

const GITHUB_GRAPHQL_URL = "https://api.github.com/graphql";

export interface GithubContributionDay {
  date: string; // YYYY-MM-DD, UTC-normalized by GitHub's API
  count: number;
}

/** Fetches the last `days` days of public contribution counts for a username. */
export async function fetchGithubContributions(
  username: string,
  days = 14,
): Promise<GithubContributionDay[]> {
  const token = Deno.env.get("GITHUB_APP_TOKEN");
  if (!token) throw new Error("GITHUB_APP_TOKEN secret is not configured");
  if (!username) return [];

  const to = new Date();
  const from = new Date(to.getTime() - days * 24 * 60 * 60 * 1000);

  const query = `
    query($username: String!, $from: DateTime!, $to: DateTime!) {
      user(login: $username) {
        contributionsCollection(from: $from, to: $to) {
          contributionCalendar {
            weeks { contributionDays { date contributionCount } }
          }
        }
      }
    }
  `;

  const res = await fetch(GITHUB_GRAPHQL_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      "User-Agent": "streakforge-edge-function",
    },
    body: JSON.stringify({
      query,
      variables: { username, from: from.toISOString(), to: to.toISOString() },
    }),
  });

  if (!res.ok) {
    throw new Error(`GitHub API error: ${res.status} ${res.statusText}`);
  }

  const data = await res.json();
  if (data.errors) {
    throw new Error(`GitHub GraphQL error: ${data.errors.map((e: { message: string }) => e.message).join(", ")}`);
  }

  const days_ = data.data?.user?.contributionsCollection?.contributionCalendar?.weeks
    ?.flatMap((w: { contributionDays: { date: string; contributionCount: number }[] }) => w.contributionDays) ?? [];

  return days_.map((d: { date: string; contributionCount: number }) => ({
    date: d.date,
    count: d.contributionCount,
  }));
}

/** True if the given username has any public contribution recorded on localDate. */
export async function hasGithubContributionOn(username: string, localDate: string): Promise<boolean> {
  if (!username) return false;
  const days = await fetchGithubContributions(username, 7);
  const match = days.find((d) => d.date === localDate);
  return !!match && match.count > 0;
}
