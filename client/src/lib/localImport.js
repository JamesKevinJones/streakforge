// One-time opt-in migration from the old localStorage-only app (pre-
// Supabase). Best-effort per docs/DECISIONS.md: malformed data degrades
// to "skip that day" rather than blocking the import.
import { supabase } from './supabaseClient';

const KEYS = { SETTINGS: 'sf_settings', RECORDS: 'sf_records', DISMISSED: 'sf_import_dismissed' };

export function hasLocalDataToImport() {
  try {
    if (localStorage.getItem(KEYS.DISMISSED) === '1') return false;
    const records = JSON.parse(localStorage.getItem(KEYS.RECORDS));
    return !!records && Object.keys(records).length > 0;
  } catch {
    return false;
  }
}

export function dismissLocalImport() {
  try {
    localStorage.setItem(KEYS.DISMISSED, '1');
  } catch {
    // best-effort; if storage is unavailable the prompt just reappears next load
  }
}

export async function importLocalData(userId) {
  let settings = {};
  let records = {};
  try {
    settings = JSON.parse(localStorage.getItem(KEYS.SETTINGS)) || {};
  } catch {
    settings = {};
  }
  try {
    records = JSON.parse(localStorage.getItem(KEYS.RECORDS)) || {};
  } catch {
    records = {};
  }

  if (settings.github_username || settings.leetcode_username) {
    await supabase
      .from('profiles')
      .update({
        github_username: settings.github_username || '',
        leetcode_username: settings.leetcode_username || '',
      })
      .eq('user_id', userId);
  }

  const dates = Object.keys(records).sort();
  let imported = 0;
  let failed = 0;

  for (const date of dates) {
    const r = records[date];
    if (!r || typeof r !== 'object') continue;
    const github = (r.github_contributed || 0) > 0;
    const leetcode = (r.leetcode_contributed || 0) > 0;
    const freezeUsed = !!r.freeze_used;
    if (!github && !leetcode && !freezeUsed) continue; // no row = correctly treated as a gap

    const { error } = await supabase.rpc('import_historical_day', {
      p_user_id: userId,
      p_local_date: date,
      p_github: github,
      p_leetcode: leetcode,
      p_freeze_used: freezeUsed,
    });
    if (error) failed += 1;
    else imported += 1;
  }

  await supabase.rpc('recompute_streak', { p_user_id: userId });
  dismissLocalImport();

  return { imported, failed, totalDays: dates.length };
}
