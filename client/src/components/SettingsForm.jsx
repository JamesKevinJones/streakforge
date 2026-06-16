import React, { useState, useEffect } from 'react';

export default function SettingsForm({ onSaved }) {
  const [form, setForm] = useState({
    github_username: '',
    leetcode_username: '',
    github_token: '',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);

  useEffect(() => {
    fetch('/api/settings')
      .then(res => res.json())
      .then(data => {
        setForm({
          github_username: data.github_username || '',
          leetcode_username: data.leetcode_username || '',
          github_token: '',
        });
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const handleChange = (e) => {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);

    try {
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to save settings');
      }

      setMessage({ type: 'success', text: 'Settings saved! Refreshing data...' });

      await fetch('/api/streak/refresh', { method: 'POST' });
      onSaved();
    } catch (err) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="settings-loading">Loading settings...</div>;
  }

  return (
    <div className="settings-form">
      <h2 className="settings-title">Account Settings</h2>
      <p className="settings-subtitle">Connect your GitHub and LeetCode accounts to track your streak.</p>

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
            Create a token at GitHub Settings → Developer settings → Personal access tokens →
            Fine-grained tokens (with repo and user scopes). Leave blank to keep existing.
          </p>
        </div>

        <button
          type="submit"
          className="btn btn-primary btn-full"
          disabled={saving}
        >
          {saving ? 'Saving...' : 'Save & Refresh'}
        </button>
      </form>
    </div>
  );
}
