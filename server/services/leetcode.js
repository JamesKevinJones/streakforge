const fetch = require('node-fetch');

const LEETCODE_API = 'https://leetcode.com/graphql';

async function fetchSubmissions(username) {
  if (!username) return [];

  const query = `
    query($username: String!) {
      matchedUser(username: $username) {
        submissionCalendar
      }
    }
  `;

  const res = await fetch(LEETCODE_API, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, variables: { username } }),
  });

  if (!res.ok) {
    throw new Error(`LeetCode API error: ${res.status} ${res.statusText}`);
  }

  const data = await res.json();
  if (data.errors) {
    throw new Error(`LeetCode GraphQL error: ${data.errors.map(e => e.message).join(', ')}`);
  }

  const calendarStr = data.data?.matchedUser?.submissionCalendar;
  if (!calendarStr) return [];

  const calendar = JSON.parse(calendarStr);
  const results = [];

  for (const [epochSec, count] of Object.entries(calendar)) {
    const date = new Date(parseInt(epochSec) * 1000).toISOString().split('T')[0];
    results.push({ date, count });
  }

  return results;
}

module.exports = { fetchSubmissions };
