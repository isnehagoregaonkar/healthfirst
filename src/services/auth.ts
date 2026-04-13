import { supabase } from './supabase';

export const signUp = async (name: string, email: string, password: string) => {
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
  return await supabase.auth.signInWithPassword({
    email,
    password,
  });
};

export const signOut = async () => {
  return await supabase.auth.signOut();
};

export async function updateAuthDisplayName(name: string): Promise<{ ok: true } | { ok: false; message: string }> {
  const trimmed = name.trim();
  if (trimmed.length < 1) {
    return { ok: false, message: 'Enter a display name.' };
  }
  if (trimmed.length > 80) {
    return { ok: false, message: 'Display name must be 80 characters or less.' };
  }
  const { error } = await supabase.auth.updateUser({
    data: { name: trimmed },
  });
  if (error) {
    return { ok: false, message: error.message };
  }
  return { ok: true };
}
