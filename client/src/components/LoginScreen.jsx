import React, { useState } from 'react';
import useAuth from '../hooks/useAuth';

export default function LoginScreen() {
  const { signInWithEmail } = useAuth();
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState('idle'); // idle | sending | sent | error
  const [errorMsg, setErrorMsg] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatus('sending');
    setErrorMsg('');
    try {
      await signInWithEmail(email.trim());
      setStatus('sent');
    } catch (err) {
      setStatus('error');
      setErrorMsg(err.message);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center p-6">
      <div className="glass w-full max-w-sm rounded-3xl p-8 text-center">
        <span className="mb-2 block text-5xl">🔥</span>
        <h1 className="mb-2 text-3xl font-extrabold tracking-tight text-white">StreakForge</h1>
        <p className="mb-6 text-sm text-white/60">Track your coding streak. Never lose it by accident.</p>

        {status === 'sent' ? (
          <div className="rounded-2xl border border-go/30 bg-go/10 p-4 text-sm text-emerald-200">
            Check <strong className="text-white">{email}</strong> for a sign-in link.
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-3">
            <input
              type="email"
              className="glass w-full rounded-2xl px-4 py-3 text-center text-white placeholder-white/30 outline-none"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <button type="submit" className="glass btn-glass btn-flame w-full" disabled={status === 'sending'}>
              {status === 'sending' ? 'Sending link...' : 'Send magic link'}
            </button>
            {status === 'error' && <p className="text-sm font-semibold text-red-300">{errorMsg}</p>}
          </form>
        )}
      </div>
    </div>
  );
}
