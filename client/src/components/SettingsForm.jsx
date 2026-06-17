import React, { useState, useEffect } from 'react';
import { getSettings, saveSettings } from '../store';

export default function SettingsForm({ onSaved }) {
  const [form, setForm] = useState({
    github_username: '',
    leetcode_username: '',
    github_token: '',
    freeze_count: 2,
  });
  const [message, setMessage] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const s = getSettings();
    setForm({
      github_username: s.github_username || '',
      leetcode_username: s.leetcode_username || '',
      github_token: s.github_token || '',
      freeze_count: s.freeze_count ?? 2,
    });
  }, []);

  const handleChange = (e) => {
    const { name, value, type } = e.target;
    setForm(prev => ({ ...prev, [name]: type === 'number' ? Number(value) : value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);
    try {
      saveSettings({
        github_username: form.github_username.trim(),
        leetcode_username: form.leetcode_username.trim(),
        github_token: form.github_token.trim(),
        freeze_count: Number(form.freeze_count) || 2,
      });
      setMessage({ type: 'success', text: '✅ Settings saved! Refreshing your data now...' });
      setTimeout(() => onSaved(), 500);
    } catch (err) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="settings-form">
      <h2 className="settings-title">Account Settings</h2>
      <p className="settings-subtitle">Connect your GitHub and LeetCode accounts to start tracking your streak.</p>

      {message && (
        <div className={`settings-message ${message.type}`}>
          {message.text}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label className="form-label" htmlFor="github_username">
            GitHub Username
          </label>
          <input
            id="github_username"
            name="github_username"
            type="text"
            className="form-input"
            value={form.github_username}
            onChange={handleChange}
            placeholder="e.g. octocat"
            required
          />
        </div>

        <div className="form-group">
          <label className="form-label" htmlFor="leetcode_username">
            LeetCode Username
          </label>
          <input
            id="leetcode_username"
            name="leetcode_username"
            type="text"
            className="form-input"
            value={form.leetcode_username}
            onChange={handleChange}
            placeholder="e.g. leetcoder"
            required
          />
        </div>

        <div className="form-group">
          <label className="form-label" htmlFor="github_token">
            GitHub Personal Access Token
          </label>
          <input
            id="github_token"
            name="github_token"
            type="password"
            className="form-input"
            value={form.github_token}
            onChange={handleChange}
            placeholder="ghp_xxxxxxxxxxxx"
          />
          <p className="form-hint">
            Required for GitHub contribution data.{' '}
            <a
              href="https://github.com/settings/tokens/new?scopes=read:user&description=StreakForge"
              target="_blank"
              rel="noopener noreferrer"
              className="form-hint-link"
            >
              Generate a token →
            </a>
            {' '}(only needs <code>read:user</code> scope). Stored locally in your browser.
          </p>
        </div>

        <div className="form-group">
          <label className="form-label" htmlFor="freeze_count">
            Streak Freeze Credits
          </label>
          <input
            id="freeze_count"
            name="freeze_count"
            type="number"
            min="0"
            max="10"
            className="form-input form-input-sm"
            value={form.freeze_count}
            onChange={handleChange}
          />
          <p className="form-hint">Number of days you can miss without breaking your streak.</p>
        </div>

        <div className="form-info-box">
          <span className="form-info-icon">🔒</span>
          <span>Your credentials are stored only in your browser's localStorage — never sent to any server.</span>
        </div>

        <button
          type="submit"
          className="btn btn-primary btn-full"
          disabled={saving}
        >
          {saving ? 'Saving...' : 'Save Settings'}
        </button>
      </form>
    </div>
  );
}
