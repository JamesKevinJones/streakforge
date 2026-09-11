import React, { useState } from 'react';
import StreakCard from './components/StreakCard';
import CalendarGrid from './components/CalendarGrid';
import DailyGoals from './components/DailyGoals';
import SettingsForm from './components/SettingsForm';
import LoginScreen from './components/LoginScreen';
import ImportPrompt from './components/ImportPrompt';
import InstallPrompt from './components/InstallPrompt';
import GooeyNav from './components/ui/GooeyNav';
import GitHubActivity from './components/ui/GitHubActivity';
import EmojiReaction from './components/ui/EmojiReaction';
import { LogOutIcon, SyncIcon, AlertIcon, SnowflakeIcon } from './components/icons';
import useAuth from './hooks/useAuth';
import useStreak from './hooks/useStreak';
import { hasLocalDataToImport, dismissLocalImport } from './lib/localImport';

const NAV_VIEWS = ['dashboard', 'settings'];

export default function App() {
  const { user, loading: authLoading, signOut } = useAuth();

  if (authLoading) {
    return (
      <div>
        <div className="loading-screen">
          <div className="flame-loader">🔥</div>
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <LoginScreen />;
  }

  return <Dashboard userId={user.id} onSignOut={signOut} />;
}

function Dashboard({ userId, onSignOut }) {
  const [view, setView] = useState('dashboard');
  const [showImport, setShowImport] = useState(hasLocalDataToImport());
  const { data, loading, error, refresh, refreshing, refetch, useRepairCredit } = useStreak(userId);

  if (loading) {
    return (
      <div>
        <div className="loading-screen">
          <div className="flame-loader">🔥</div>
          <p>Loading your streak...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <InstallPrompt />

      {showImport && (
        <div className="glass mx-4 mt-4 flex flex-col items-start gap-3 rounded-3xl p-4 sm:mx-6">
          <ImportPrompt
            userId={userId}
            onDone={() => {
              setShowImport(false);
              refetch();
            }}
            onDismiss={() => {
              dismissLocalImport();
              setShowImport(false);
            }}
          />
        </div>
      )}

      {!data?.hasSettings && view === 'dashboard' ? (
        <div className="glass mx-4 mt-4 flex flex-wrap items-center justify-between gap-3 rounded-3xl p-4 sm:mx-6">
          <p className="text-sm font-semibold text-white/85">Welcome to StreakForge! Add your usernames to start tracking.</p>
          <button className="glass btn-glass btn-flame" onClick={() => setView('settings')}>Get Started</button>
        </div>
      ) : null}

      <header className="flex flex-wrap items-center justify-between gap-3 px-4 py-4 sm:px-6">
        <div className="flex cursor-pointer items-center gap-2" onClick={() => setView('dashboard')}>
          <span className="text-2xl">🔥</span>
          <span className="text-lg font-extrabold tracking-tight text-white">StreakForge</span>
        </div>

        <div className="flex items-center gap-3">
          <GooeyNav
            items={['Dashboard', 'Settings']}
            value={NAV_VIEWS.indexOf(view)}
            onChange={(i) => setView(NAV_VIEWS[i])}
            size="sm"
          />
          {view === 'dashboard' && data?.hasSettings && (
            <button
              className="glass btn-glass px-4 py-2 text-sm"
              onClick={refresh}
              disabled={refreshing}
              title="Sync GitHub & LeetCode data"
            >
              <SyncIcon width={16} height={16} className={refreshing ? 'animate-spin' : ''} />
              {refreshing ? 'Syncing...' : 'Sync'}
            </button>
          )}
          <button className="glass btn-glass px-4 py-2 text-sm" onClick={onSignOut}>
            <LogOutIcon width={16} height={16} /> Sign out
          </button>
        </div>
      </header>

      {error && (
        <div className="glass mx-4 mb-2 flex items-center justify-between gap-3 rounded-2xl border-danger/30 bg-danger/10 p-3 text-sm font-semibold text-red-200 sm:mx-6">
          <span className="flex items-center gap-2"><AlertIcon width={18} height={18} /> {error}</span>
          <button onClick={() => refetch()} className="text-white/70 hover:text-white">✕</button>
        </div>
      )}

      <main className="mx-auto flex w-full max-w-2xl flex-col gap-5 px-4 pb-10 sm:px-6">
        {view === 'dashboard' ? (
          <>
            <StreakCard
              streak={data?.currentStreak || 0}
              freezeCount={data?.freezeCount || 0}
              todayContributed={data?.todayContributed || false}
              todayStatus={data?.todayStatus}
              longestStreak={data?.longestStreak || 0}
            />
            {data?.openRepairWindow && (
              <div className="glass flex flex-col items-start gap-3 rounded-3xl border-frost/30 bg-frost/10 p-5">
                <p className="flex items-center gap-2 text-sm font-medium text-white/85">
                  <SnowflakeIcon width={18} height={18} className="text-frost shrink-0" />
                  Your streak is in a 24h repair window. Log a real contribution, or spend one of your{' '}
                  {data.repairCredits} repair credit{data.repairCredits === 1 ? '' : 's'} to save it.
                </p>
                {data.repairCredits > 0 && (
                  <button className="glass btn-glass btn-flame" onClick={useRepairCredit}>Use Streak Repair</button>
                )}
              </div>
            )}
            <DailyGoals
              githubDone={(data?.todayGithub || 0) > 0}
              leetcodeDone={(data?.todayLeetcode || 0) > 0}
            />
            <CalendarGrid history={data?.history || []} />

            {data?.githubUsername && (
              <div>
                <h2 className="mb-3 text-lg font-bold text-white">GitHub Activity</h2>
                <GitHubActivity username={data.githubUsername} accent="#ff5b1f" />
              </div>
            )}

            <div className="glass flex flex-col items-center gap-3 rounded-3xl p-6 text-center">
              <h2 className="text-sm font-bold text-white/85">Need a breather?</h2>
              <p className="text-xs text-white/50">Throw a few feelings at the screen. No judgment.</p>
              <EmojiReaction size="lg" />
            </div>
          </>
        ) : (
          <SettingsForm userId={userId} onSaved={() => { setView('dashboard'); refresh(); }} />
        )}
      </main>
    </div>
  );
}
