import { isSupabaseConfigured, supabase } from './supabase';

const missingConfig = () =>
  ({
    error: {
      message:
        'Missing Supabase configuration. Add SUPABASE_URL and SUPABASE_ANON_KEY to your .env file, restart Metro with --reset-cache, then rebuild the app.',
    },
  }) as const;

export const signUp = async (name: string, email: string, password: string) => {
  if (!isSupabaseConfigured) {
    return missingConfig();
  }
  const signUpResult = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        name,
      },
    },
  });

  if (signUpResult.error) {
    return signUpResult;
  }

  if (signUpResult.data.session) {
    return signUpResult;
  }

  return await supabase.auth.signInWithPassword({
    email,
    password,
  });
};

export const signIn = async (email: string, password: string) => {
  if (!isSupabaseConfigured) {
    return missingConfig();
  }
  return await supabase.auth.signInWithPassword({
    email,
    password,
  });
};

export const signOut = async () => {
  if (!isSupabaseConfigured) {
    return missingConfig();
  }
  return await supabase.auth.signOut();
};
