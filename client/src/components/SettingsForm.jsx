import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import HourPicker from './ui/HourPicker';
import DeleteButton from './ui/DeleteButton';
import { subscribeToPush, unsubscribeFromPush, pushSupported } from '../lib/push';
import { isIOSSafari, isStandalone } from '../lib/platform';
import { ShareIcon } from './icons';

export default function SettingsForm({ userId, onSaved }) {
  const [deleteError, setDeleteError] = useState(null);
  const [pushError, setPushError] = useState(null);
  const [pushNeedsInstall, setPushNeedsInstall] = useState(false);
  const [pushBusy, setPushBusy] = useState(false);
  const [form, setForm] = useState({
    github_username: '',
    leetcode_username: '',
    daily_goal_notify_hour: 21,
    notifications_enabled: false,
    email_reminders_enabled: false,
  });
  const [message, setMessage] = useState(null);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    supabase
      .from('profiles')
      .select('github_username, leetcode_username, daily_goal_notify_hour, notifications_enabled, email_reminders_enabled')
      .eq('user_id', userId)
      .single()
      .then(({ data, error }) => {
        if (cancelled) return;
        if (!error && data) {
          setForm({
            github_username: data.github_username || '',
            leetcode_username: data.leetcode_username || '',
            daily_goal_notify_hour: data.daily_goal_notify_hour ?? 21,
            notifications_enabled: !!data.notifications_enabled,
            email_reminders_enabled: !!data.email_reminders_enabled,
          });
        }
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [userId]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleNotificationsToggle = async (checked) => {
    setPushError(null);
    setPushNeedsInstall(false);

    if (checked && isIOSSafari() && !isStandalone()) {
      setPushNeedsInstall(true);
      return;
    }
    if (checked && !pushSupported()) {
      setPushError('Push notifications are not supported in this browser.');
      return;
    }

    setPushBusy(true);
    try {
      if (checked) {
        await subscribeToPush(userId);
      } else {
        await unsubscribeFromPush(userId);
      }
      const { error } = await supabase
        .from('profiles')
        .update({ notifications_enabled: checked })
        .eq('user_id', userId);
      if (error) throw error;
      setForm((prev) => ({ ...prev, notifications_enabled: checked }));
    } catch (err) {
      setPushError(err.message);
    } finally {
      setPushBusy(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);
    try {
      const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
      const { error } = await supabase
        .from('profiles')
        .update({
          github_username: form.github_username.trim(),
          leetcode_username: form.leetcode_username.trim(),
          daily_goal_notify_hour: form.daily_goal_notify_hour,
          notifications_enabled: form.notifications_enabled,
          email_reminders_enabled: form.email_reminders_enabled,
          timezone,
        })
        .eq('user_id', userId);
      if (error) throw error;
      setMessage({ type: 'success', text: 'Settings saved! Syncing your data now...' });
      setTimeout(() => onSaved(), 500);
    } catch (err) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setSaving(false);
    }
  };

  if (loading) return null;

  return (
    <div className="glass rounded-3xl p-6">
      <h2 className="mb-1 text-xl font-bold text-white">Account Settings</h2>
      <p className="mb-6 text-sm text-white/60">
        Just your usernames — StreakForge checks your public activity server-side, so there's no token to manage.
      </p>

      {message && (
        <div
          className={`mb-5 rounded-2xl border p-3 text-sm font-semibold ${
            message.type === 'success'
              ? 'border-go/30 bg-go/10 text-emerald-200'
              : 'border-danger/30 bg-danger/10 text-red-200'
          }`}
        >
          {message.text}
        </div>
      )}

      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
        <div>
          <label className="mb-1.5 block font-mono text-xs font-bold uppercase tracking-wide text-white/50" htmlFor="github_username">
            GitHub Username
          </label>
          <input
            id="github_username"
            name="github_username"
            type="text"
            className="glass w-full rounded-2xl px-4 py-3 text-white placeholder-white/30 outline-none focus:border-flame/50"
            value={form.github_username}
            onChange={handleChange}
            placeholder="e.g. octocat"
            required
          />
        </div>

        <div>
          <label className="mb-1.5 block font-mono text-xs font-bold uppercase tracking-wide text-white/50" htmlFor="leetcode_username">
            LeetCode Username
          </label>
          <input
            id="leetcode_username"
            name="leetcode_username"
            type="text"
            className="glass w-full rounded-2xl px-4 py-3 text-white placeholder-white/30 outline-none focus:border-flame/50"
            value={form.leetcode_username}
            onChange={handleChange}
            placeholder="e.g. leetcoder"
            required
          />
        </div>

        <div>
          <span className="mb-1.5 block font-mono text-xs font-bold uppercase tracking-wide text-white/50">
            Evening reminder hour (your local time)
          </span>
          <HourPicker
            value={form.daily_goal_notify_hour}
            onChange={(hour) => setForm((prev) => ({ ...prev, daily_goal_notify_hour: hour }))}
          />
          <p className="mt-2 text-xs text-white/45">We'll nudge you around this hour if you haven't hit your goal yet.</p>
        </div>

        <div>
          <label className="flex items-center gap-2.5 text-sm font-semibold text-white/85">
            <input
              type="checkbox"
              name="notifications_enabled"
              checked={form.notifications_enabled}
              disabled={pushBusy}
              onChange={(e) => handleNotificationsToggle(e.target.checked)}
              className="size-5 accent-flame"
            />
            Push notifications
          </label>
          {pushNeedsInstall && (
            <p className="mt-2 flex items-center gap-2 text-xs text-white/60">
              <ShareIcon width={14} height={14} className="shrink-0 text-flame" />
              iOS only supports push once StreakForge is added to your home screen — tap{' '}
              <span className="font-mono text-white">Share</span>, then{' '}
              <span className="font-mono text-white">Add to Home Screen</span>, then try again.
            </p>
          )}
          {pushError && <p className="mt-2 text-xs font-semibold text-red-300">{pushError}</p>}
        </div>

        <label className="flex items-center gap-2.5 text-sm font-semibold text-white/85">
          <input
            type="checkbox"
            name="email_reminders_enabled"
            checked={form.email_reminders_enabled}
            onChange={handleChange}
            className="size-5 accent-flame"
          />
          Email reminders
        </label>

        <button type="submit" className="glass btn-glass btn-flame w-full" disabled={saving}>
          {saving ? 'Saving...' : 'Save Settings'}
        </button>
      </form>

      <div className="mt-8 border-t border-white/10 pt-6">
        <h3 className="mb-1 text-sm font-bold text-white/85">Danger zone</h3>
        <p className="mb-3 text-xs text-white/50">
          Permanently deletes your account, streak history, and settings. This can't be undone.
        </p>
        {deleteError && <p className="mb-3 text-xs font-semibold text-red-300">{deleteError}</p>}
        <DeleteButton
          label="Delete account"
          confirmLabel="Delete account?"
          onConfirm={async () => {
            setDeleteError(null);
            const { error } = await supabase.rpc('delete_own_account');
            if (error) {
              setDeleteError(error.message);
              return;
            }
            await supabase.auth.signOut();
          }}
        />
      </div>
    </div>
  );
}
