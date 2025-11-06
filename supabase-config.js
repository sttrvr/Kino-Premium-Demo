// Supabase client configuration
// IMPORTANT: Use your Supabase project URL and ANON public key (NOT the service role key)
// Replace the placeholders below with your real values from Supabase Dashboard > Project Settings > API

// Example:
// const SUPABASE_URL = 'https://your-project-id.supabase.co';
// const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...';

const SUPABASE_URL = 'https://qqkpofwxdghjdqemynzs.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFxa3BvZnd4ZGdoamRxZW15bnpzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg5NzQ2MzksImV4cCI6MjA3NDU1MDYzOX0.nFR9GJLjIfzVfGVNSEym5n1GSJGq4xcdhvOTyP3XeDs';

// Expose a single shared client on window
;(function(){
  if (typeof window === 'undefined') return;
  if (!window.supabase || !window.supabase.createClient) {
    console.warn('Supabase JS not loaded yet. Ensure @supabase/supabase-js CDN is included.');
    return;
  }
  try {
    window.SUPABASE = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: { persistSession: true, autoRefreshToken: true }
    });
  } catch (e) {
    console.error('Failed to init Supabase client', e);
  }
})();