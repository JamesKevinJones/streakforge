const fetch = require('node-fetch');

async function fetchContributions(username, token) {
  if (!username || !token) return [];

  const query = `
    query($username: String!, $from: DateTime!, $to: DateTime!) {
      user(login: $username) {
        contributionsCollection(from: $from, to: $to) {
          contributionCalendar {
            weeks {
              contributionDays {
                date
                contributionCount
              }
            }
          }
        }
      }
    }
  `;

  const now = new Date();
  const to = now.toISOString();
  const from = new Date(now.getTime() - 120 * 24 * 60 * 60 * 1000).toISOString();

  const res = await fetch('https://api.github.com/graphql', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query, variables: { username, from, to } }),
  });

  if (!res.ok) {
    throw new Error(`GitHub API error: ${res.status} ${res.statusText}`);
  }

  const data = await res.json();
  if (data.errors) {
    throw new Error(`GitHub GraphQL error: ${data.errors.map(e => e.message).join(', ')}`);
  }

  const days = data.data?.user?.contributionsCollection?.contributionCalendar?.weeks
    ?.flatMap(w => w.contributionDays) || [];

  return days.map(d => ({ date: d.date, count: d.contributionCount }));
}

module.exports = { fetchContributions };
