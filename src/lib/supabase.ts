import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

/** True when both Supabase environment variables are present. */
export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

/**
 * Local demo mode: authentication and storage are backed by localStorage.
 *
 * This mode stores passwords in plaintext and auto-creates an account for any
 * unrecognised email, so it is gated on `import.meta.env.DEV` and can never be
 * reached from a production bundle. A production build that is missing its
 * Supabase credentials fails loudly below rather than silently degrading to
 * insecure authentication.
 */
export const isDemoMode = !isSupabaseConfigured && import.meta.env.DEV;

if (!isSupabaseConfigured && !import.meta.env.DEV) {
  throw new Error(
    'JobTrack is misconfigured: VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are required ' +
      'for a production build. Copy .env.example to .env and supply your Supabase project ' +
      'credentials. The insecure local demo mode is available in development only.'
  );
}

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;
