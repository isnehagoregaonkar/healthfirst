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
