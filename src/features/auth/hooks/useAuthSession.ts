import { useEffect, useState } from 'react';
import { isSupabaseConfigured, supabase } from '../../../services/supabase';

/** Keep splash at least this long for a calm transition (session load usually wins). */
const MIN_SPLASH_MS = 600;

async function waitMinSplash(started: number) {
  const elapsed = Date.now() - started;
  await new Promise<void>((resolve) => {
    setTimeout(resolve, Math.max(0, MIN_SPLASH_MS - elapsed));
  });
}

export function useAuthSession() {
  const [showSplash, setShowSplash] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const bootstrap = async () => {
      const started = Date.now();

      if (!isSupabaseConfigured) {
        await waitMinSplash(started);
        if (!cancelled) {
          setShowSplash(false);
        }
        return;
      }

      try {
        const { data } = await supabase.auth.getSession();
        if (!cancelled) {
          setIsAuthenticated(Boolean(data.session));
        }
      } catch (e) {
        console.warn('useAuthSession: getSession failed', e);
        if (!cancelled) {
          setIsAuthenticated(false);
        }
      } finally {
        await waitMinSplash(started);
        if (!cancelled) {
          setShowSplash(false);
        }
      }
    };

    void bootstrap();

    if (!isSupabaseConfigured) {
      return () => {
        cancelled = true;
      };
    }

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsAuthenticated(Boolean(session));
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, []);

  return { showSplash, isAuthenticated };
}
