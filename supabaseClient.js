// Shared Supabase client initialization with safe guards
// Update these constants if you change project credentials
const SUPABASE_URL = 'https://dbpmgzgeevgotfxsldjh.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRicG1nemdlZXZnb3RmeHNsZGpoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk1NjA2NDksImV4cCI6MjA3NTEzNjY0OX0.TLYH19D6jH0-g4OfbwI_XYPy8flk54JFDeZW05CirdU';

// Expose credentials for modules that need raw URL (e.g., custom XHR uploads)
// Note: top-level const is not attached to window by default; set explicit globals
window.SUPABASE_URL = 'https://dbpmgzgeevgotfxsldjh.supabase.co';
window.SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRicG1nemdlZXZnb3RmeHNsZGpoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk1NjA2NDksImV4cCI6MjA3NTEzNjY0OX0.TLYH19D6jH0-g4OfbwI_XYPy8flk54JFDeZW05CirdU';

if (!window.supabase) {
    throw new Error('Supabase JS not loaded. Include @supabase/supabase-js before supabaseClient.js');
}

/**
 * Create and return a Supabase client instance.
 */
function getSupabaseClient() {
    try {
        const client = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
            auth: {
                persistSession: true,
                autoRefreshToken: true,
                detectSessionInUrl: true,
                storageKey: 'studyshare-auth'
            }
        });
        return client;
    } catch (err) {
        console.error('Failed to initialize Supabase client:', err);
        throw err;
    }
}

window.getSupabaseClient = getSupabaseClient;


