import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabaseClient';
import { fetchLeetCodeContributedToday } from '../lib/leetcode';

const HISTORY_DAYS = 70;

export default function useStreak(userId) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    if (!userId) return;
    try {
      const [{ data: profile, error: profileErr }, { data: streak, error: streakErr }, { data: history, error: historyErr }] =
        await Promise.all([
          supabase.from('profiles').select('*').eq('user_id', userId).single(),
          supabase.from('streak_state').select('*').eq('user_id', userId).single(),
          supabase
            .from('daily_records')
            .select('local_date, github_contributed, leetcode_contributed, status, freeze_applied')
            .eq('user_id', userId)
            .order('local_date', { ascending: false })
            .limit(HISTORY_DAYS),
        ]);

      if (profileErr) throw profileErr;
      if (streakErr) throw streakErr;
      if (historyErr) throw historyErr;

      const todayStr = new Date().toISOString().split('T')[0];
      const todayRecord = history?.find((h) => h.local_date === todayStr);

      setData({
        currentStreak: streak?.current_streak ?? 0,
        longestStreak: streak?.longest_streak ?? 0,
        freezeCount: profile?.freeze_count ?? 0,
        repairCredits: profile?.repair_credits ?? 0,
        todayContributed: todayRecord?.status === 'completed' || todayRecord?.status === 'freeze_applied',
        todayStatus: todayRecord?.status || 'pending',
        todayGithub: todayRecord?.github_contributed ? 1 : 0,
        todayLeetcode: todayRecord?.leetcode_contributed ? 1 : 0,
        hasSettings: !!(profile?.github_username && profile?.leetcode_username),
        githubUsername: profile?.github_username || '',
        history: (history || []).map((h) => ({
          date: h.local_date,
          github_contributed: h.github_contributed ? 1 : 0,
          leetcode_contributed: h.leetcode_contributed ? 1 : 0,
          freeze_used: h.freeze_applied ? 1 : 0,
          status: h.status,
        })),
        openRepairWindow: (history || []).find((h) => h.status === 'repair_window') || null,
      });
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  const refresh = useCallback(async () => {
    if (!userId) return;
    setRefreshing(true);
    setError(null);
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('github_username, leetcode_username')
        .eq('user_id', userId)
        .single();

      if (!profile?.github_username && !profile?.leetcode_username) {
        throw new Error('Add your GitHub and LeetCode usernames in Settings first.');
      }

      let leetcodeContributed = false;
      let leetcodeWarning = null;
      if (profile?.leetcode_username) {
        try {
          leetcodeContributed = await fetchLeetCodeContributedToday(profile.leetcode_username);
        } catch (err) {
          leetcodeWarning = `LeetCode check failed: ${err.message}`;
        }
      }

      const { data: result, error: fnError } = await supabase.functions.invoke('sync-activity', {
        body: { leetcodeContributed },
      });
      if (fnError) throw fnError;
      if (result?.githubError) {
        leetcodeWarning = leetcodeWarning
          ? `${leetcodeWarning} | GitHub check failed: ${result.githubError}`
          : `GitHub check failed: ${result.githubError}`;
      }

      await load();
      if (leetcodeWarning) setError(`Warning: ${leetcodeWarning}`);
    } catch (err) {
      setError(err.message);
    } finally {
      setRefreshing(false);
    }
  }, [userId, load]);

  const useRepairCredit = useCallback(async () => {
    if (!userId) return false;
    const { data: didRepair, error: err } = await supabase.rpc('use_repair_credit', { p_user_id: userId });
    if (err) {
      setError(err.message);
      return false;
    }
    await load();
    return !!didRepair;
  }, [userId, load]);

  useEffect(() => {
    setLoading(true);
    load();
  }, [load]);

  return { data, loading, error, refresh, refreshing, refetch: load, useRepairCredit };
}
