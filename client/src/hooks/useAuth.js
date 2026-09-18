import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabaseClient';

// Fire-and-forget: keeps profiles.timezone from silently going stale after
// travel. The `.neq` guard means this is a no-op write on every call except
// the rare one where the browser's zone has actually changed since last
// login - cheap enough to just call on every session-establishment, not
// worth gating further.
function syncTimezone(userId) {
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  supabase.from('profiles').update({ timezone: tz }).eq('user_id', userId).neq('timezone', tz);
}

export default function useAuth() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
      if (data.session?.user?.id) syncTimezone(data.session.user.id);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
      if (newSession?.user?.id) syncTimezone(newSession.user.id);
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  const signInWithEmail = useCallback(async (email) => {
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: window.location.origin },
    });
    if (error) throw error;
  }, []);

  const signOut = useCallback(() => supabase.auth.signOut(), []);

  return {
    session,
    user: session?.user ?? null,
    loading,
    signInWithEmail,
    signOut,
  };
}
