import React, { useState } from 'react';
import StreakCard from './components/StreakCard';
import CalendarGrid from './components/CalendarGrid';
import DailyGoals from './components/DailyGoals';
import SettingsForm from './components/SettingsForm';
import useStreak from './hooks/useStreak';

export default function App() {
  const [view, setView] = useState('dashboard');
  const { data, loading, error, refresh, refreshing, refetch } = useStreak();

  if (loading) {
    return (
      <div className="app">
        <div className="loading-screen">
          <div className="flame-loader">🔥</div>
          <p>Loading your streak...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="app">
      {!data?.hasSettings && view === 'dashboard' ? (
        <div className="setup-banner">
          <p>Welcome to StreakForge! Configure your accounts to start tracking.</p>
          <button className="btn btn-primary" onClick={() => setView('settings')}>
            Get Started
          </button>
        </div>
      ) : null}

      <nav className="nav">
        <div className="nav-brand" onClick={() => setView('dashboard')}>
          <span className="nav-logo">🔥</span>
          <span className="nav-title">StreakForge</span>
        </div>
        <div className="nav-links">
          <button
            className={`nav-link ${view === 'dashboard' ? 'active' : ''}`}
            onClick={() => setView('dashboard')}
          >
            Dashboard
          </button>
          <button
            className={`nav-link ${view === 'settings' ? 'active' : ''}`}
            onClick={() => setView('settings')}
          >
            Settings
          </button>
          {view === 'dashboard' && data?.hasSettings && (
            <button
              className={`nav-link refresh-btn ${refreshing ? 'spinning' : ''}`}
              onClick={refresh}
              disabled={refreshing}
              title="Sync GitHub & LeetCode data"
            >
              {refreshing ? '⏳' : '🔄'} {refreshing ? 'Syncing...' : 'Sync'}
            </button>
          )}
        </div>
      </nav>

      {error && (
        <div className="error-banner">
          <span>⚠️ {error}</span>
          <button onClick={() => refetch()} className="error-dismiss">✕</button>
        </div>
      )}

      <main className="main">
        {view === 'dashboard' ? (
          <>
            <StreakCard
              streak={data?.currentStreak || 0}
              freezeCount={data?.freezeCount || 0}
              todayContributed={data?.todayContributed || false}
              longestStreak={data?.longestStreak || 0}
            />
            <DailyGoals
              githubDone={(data?.todayGithub || 0) > 0}
              leetcodeDone={(data?.todayLeetcode || 0) > 0}
            />
            <CalendarGrid history={data?.history || []} />
          </>
        ) : (
          <SettingsForm onSaved={() => { setView('dashboard'); refresh(); }} />
        )}
      </main>
    </div>
  );
}
