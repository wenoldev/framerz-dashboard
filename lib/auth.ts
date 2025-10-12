'use server';

import { createServerSupabaseClient } from './supabase/server';

export async function signUp(email: string, password: string) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${process.env.NEXT_PUBLIC_BASE_URL}/auth/callback`,
      },
    });

    return { data, error };
  } catch (err) {
    console.error('Error in signUp:', err);
    return { data: null, error: { message: 'Server error during sign-up' } };
  }
}

export async function signIn(email: string, password: string) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    return { data, error };
  } catch (err) {
    console.error('Error in signIn:', err);
    return { data: null, error: { message: 'Server error during sign-in' } };
  }
}

export async function signOut() {
  try {
    const supabase = await createServerSupabaseClient();
    const { error } = await supabase.auth.signOut();
    return { error };
  } catch (err) {
    console.error('Error in signOut:', err);
    return { error: { message: 'Server error during sign-out' } };
  }
}

export async function getSession() {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { session } } = await supabase.auth.getSession();
    return session;
  } catch (err) {
    console.error('Error in getSession:', err);
    return null;
  }
}

export async function forgotPassword(email: string) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/update-password`,
    });

    return { data, error };
  } catch (err) {
    console.error('Error in forgotPassword:', err);
    return { data: null, error: { message: 'Server error during password reset' } };
  }
}