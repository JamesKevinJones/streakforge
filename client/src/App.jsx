import React, { useState } from 'react';
import StreakCard from './components/StreakCard';
import CalendarGrid from './components/CalendarGrid';
import DailyGoals from './components/DailyGoals';
import SettingsForm from './components/SettingsForm';
import useStreak from './hooks/useStreak';

export default function App() {
  const [view, setView] = useState('dashboard');
  const { data, loading, error, refresh } = useStreak();

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

  if (error && !data) {
    return (
      <div className="app">
        <div className="error-screen">
          <h2>Something went wrong</h2>
          <p>{error}</p>
          <button className="btn btn-primary" onClick={refresh}>Retry</button>
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
        </div>
      </nav>

      <main className="main">
        {view === 'dashboard' ? (
          <>
            <StreakCard
              streak={data.currentStreak}
              freezeCount={data.freezeCount}
              todayContributed={data.todayContributed}
              longestStreak={data.longestStreak}
            />
            <DailyGoals
              githubDone={data.todayGithub > 0}
              leetcodeDone={data.todayLeetcode > 0}
            />
            <CalendarGrid history={data.history || []} />
          </>
        ) : (
          <SettingsForm onSaved={() => { setView('dashboard'); refresh(); }} />
        )}
      </main>
    </div>
  );
}
