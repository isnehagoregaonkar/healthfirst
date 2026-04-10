import { useEffect, useState } from 'react';
import { supabase } from '../../../services/supabase';

/** Keep splash at least this long for a calm transition (session load usually wins). */
const MIN_SPLASH_MS = 600;

export function useAuthSession() {
  const [showSplash, setShowSplash] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const bootstrap = async () => {
      const started = Date.now();
      const { data } = await supabase.auth.getSession();

      if (cancelled) {
        return;
      }

      setIsAuthenticated(Boolean(data.session));

      const elapsed = Date.now() - started;
      await new Promise<void>((resolve) => {
        setTimeout(resolve, Math.max(0, MIN_SPLASH_MS - elapsed));
      });

      if (!cancelled) {
        setShowSplash(false);
      }
    };

    void bootstrap();

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
