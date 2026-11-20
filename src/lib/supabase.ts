import { createClient, SupabaseClient, User as SupabaseUser, Session } from '@supabase/supabase-js';

let activeSupabaseUrl = (import.meta.env.VITE_SUPABASE_URL || '').trim();
let activeSupabaseAnonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY || '').trim();

function isValidConfig(url: string, key: string): boolean {
  return (
    Boolean(url) &&
    Boolean(key) &&
    !url.includes('YOUR_PROJECT_REF') &&
    !key.includes('YOUR_SUPABASE_ANON_KEY')
  );
}

export let isSupabaseConfigured: boolean = isValidConfig(
  activeSupabaseUrl,
  activeSupabaseAnonKey
);

export let supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(activeSupabaseUrl, activeSupabaseAnonKey, {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
      },
    })
  : null;

let initPromise: Promise<boolean> | null = null;

export async function ensureSupabaseInitialized(): Promise<boolean> {
  if (supabase && isSupabaseConfigured) {
    return true;
  }

  if (initPromise) {
    return initPromise;
  }

  initPromise = (async () => {
    try {
      const res = await fetch('/api/supabase-config', { cache: 'no-store' });
      if (!res.ok) return false;
      const json = (await res.json()) as {
        supabaseUrl?: string;
        supabaseAnonKey?: string;
      };
      const url = (json.supabaseUrl || '').trim();
      const key = (json.supabaseAnonKey || '').trim();
      if (isValidConfig(url, key)) {
        activeSupabaseUrl = url;
        activeSupabaseAnonKey = key;
        isSupabaseConfigured = true;
        supabase = createClient(url, key, {
          auth: {
            autoRefreshToken: true,
            persistSession: true,
            detectSessionInUrl: false,
          },
        });
        return true;
      }
      return false;
    } catch {
      return false;
    }
  })();

  return initPromise;
}

export function getSupabaseCredentials(): { url: string; anonKey: string } {
  return { url: activeSupabaseUrl, anonKey: activeSupabaseAnonKey };
}

export async function signInWithEmailSupabase(
  email: string,
  password: string
): Promise<{ user: SupabaseUser | null; session: Session | null }> {
  await ensureSupabaseInitialized();
  if (!supabase) {
    throw new Error(
      'Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your environment settings.'
    );
  }
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  if (error) throw error;
  return { user: data.user, session: data.session };
}

export async function signUpWithEmailSupabase(
  email: string,
  password: string,
  metadata?: {
    name?: string;
    badge_id?: string;
    rank?: string;
    station_id?: string;
    station_name?: string;
    role?: string;
    phone?: string;
  }
): Promise<{ user: SupabaseUser | null; session: Session | null }> {
  await ensureSupabaseInitialized();
  if (!supabase) {
    throw new Error(
      'Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your environment settings.'
    );
  }
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: metadata ? { data: metadata } : undefined,
  });
  if (error) throw error;
  return { user: data.user, session: data.session };
}

export async function signOutSupabase(): Promise<void> {
  await ensureSupabaseInitialized();
  if (!supabase) return;
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

export type { SupabaseUser, Session };
