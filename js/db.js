const SUPABASE_URL = "https://blksobxsslzpavjjjtfs.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_ELcDXQ4uVbeoj04j5zYm6g_-xizRLkf";

window.db = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);