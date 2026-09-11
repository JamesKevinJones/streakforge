import React, { useEffect, useState } from 'react';
import { InstallIcon, ShareIcon } from './icons';
import { isStandalone, isIOSSafari } from '../lib/platform';

const DISMISSED_KEY = 'sf_install_prompt_dismissed';

export default function InstallPrompt() {
  const [mode, setMode] = useState(null); // null | 'promptable' | 'ios'
  const [deferredEvent, setDeferredEvent] = useState(null);

  useEffect(() => {
    if (isStandalone() || localStorage.getItem(DISMISSED_KEY)) return;

    if (isIOSSafari()) {
      setMode('ios');
      return;
    }

    const handler = (event) => {
      event.preventDefault();
      setDeferredEvent(event);
      setMode('promptable');
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const dismiss = () => {
    localStorage.setItem(DISMISSED_KEY, '1');
    setMode(null);
  };

  const install = async () => {
    if (!deferredEvent) return;
    deferredEvent.prompt();
    await deferredEvent.userChoice;
    setDeferredEvent(null);
    setMode(null);
  };

  if (!mode) return null;

  return (
    <div className="glass mx-4 mt-4 flex flex-wrap items-center justify-between gap-3 rounded-3xl p-4 sm:mx-6">
      {mode === 'promptable' && (
        <>
          <p className="flex items-center gap-2 text-sm font-semibold text-white/85">
            <InstallIcon width={18} height={18} className="shrink-0 text-flame" />
            Install StreakForge for one-tap access and streak reminders.
          </p>
          <div className="flex gap-2">
            <button className="glass btn-glass btn-flame" onClick={install}>Install</button>
            <button className="glass btn-glass" onClick={dismiss}>Not now</button>
          </div>
        </>
      )}
      {mode === 'ios' && (
        <>
          <p className="flex items-center gap-2 text-sm font-semibold text-white/85">
            <ShareIcon width={18} height={18} className="shrink-0 text-flame" />
            Tap <span className="font-mono text-white">Share</span>, then{' '}
            <span className="font-mono text-white">Add to Home Screen</span> to install StreakForge.
          </p>
          <button className="glass btn-glass" onClick={dismiss}>Got it</button>
        </>
      )}
    </div>
  );
}
