import { useEffect, useState } from 'react';
import { supabase } from '../../services/supabase';

export type ProfileGender = 'male' | 'female';

export type DrawerUserProfile = Readonly<{
  name: string;
  email: string;
  /** From `user_metadata.gender` when set; otherwise null (UI may default e.g. to female silhouette). */
  gender: ProfileGender | null;
}>;

function normalizeGender(raw: unknown): ProfileGender | null {
  if (typeof raw !== 'string') {
    return null;
  }
  const g = raw.trim().toLowerCase();
  if (g === 'male' || g === 'man' || g === 'm') {
    return 'male';
  }
  if (g === 'female' || g === 'woman' || g === 'f' || g === 'w') {
    return 'female';
  }
  return null;
}

function mapUserToProfile(user: {
  email?: string | null;
  user_metadata?: Record<string, unknown>;
}): DrawerUserProfile {
  const email = user.email ?? '';
  const metaName = user.user_metadata?.name;
  const name =
    typeof metaName === 'string' && metaName.trim().length > 0
      ? metaName.trim()
      : email.split('@')[0] || 'User';
  const gender = normalizeGender(user.user_metadata?.gender);
  return { name, email, gender };
}

export function useDrawerUserProfile() {
  const [profile, setProfile] = useState<DrawerUserProfile | null>(null);

  useEffect(() => {
    let isMounted = true;

    const load = async () => {
      const { data } = await supabase.auth.getUser();
      if (!isMounted || !data.user) {
        return;
      }
      setProfile(mapUserToProfile(data.user));
    };

    load();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!isMounted) {
        return;
      }
      if (session?.user) {
        setProfile(mapUserToProfile(session.user));
      } else {
        setProfile(null);
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  return profile;
}
