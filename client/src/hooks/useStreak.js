import { useState, useEffect, useCallback } from 'react';
import {
  computeStreakData,
  fetchGitHubContributions,
  fetchLeetCodeContributions,
  mergeActivity,
  getSettings,
} from '../store';

export default function useStreak() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  const loadLocal = useCallback(() => {
    try {
      const streakData = computeStreakData();
      setData(streakData);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    setError(null);
    try {
      const settings = getSettings();
      if (!settings.github_username && !settings.leetcode_username) {
        throw new Error('Configure your GitHub and LeetCode usernames in settings first.');
      }

      const [githubMap, leetcodeMap] = await Promise.allSettled([
        fetchGitHubContributions(settings.github_username, settings.github_token),
        fetchLeetCodeContributions(settings.leetcode_username),
      ]);

      const gh = githubMap.status === 'fulfilled' ? githubMap.value : {};
      const lc = leetcodeMap.status === 'fulfilled' ? leetcodeMap.value : {};

      if (githubMap.status === 'rejected' && leetcodeMap.status === 'rejected') {
        throw new Error(`GitHub: ${githubMap.reason.message} | LeetCode: ${leetcodeMap.reason.message}`);
      }

      mergeActivity(gh, lc);
      const streakData = computeStreakData();
      setData(streakData);

      // Warn about partial failures
      if (githubMap.status === 'rejected') {
        setError(`Warning: GitHub data unavailable — ${githubMap.reason.message}`);
      } else if (leetcodeMap.status === 'rejected') {
        setError(`Warning: LeetCode data unavailable — ${leetcodeMap.reason.message}`);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadLocal();
  }, [loadLocal]);

  return { data, loading, error, refresh, refreshing, refetch: loadLocal };
}
