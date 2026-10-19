// ─────────────────────────────────────────────────────────
// CONFIG + SHARED STATE
// ─────────────────────────────────────────────────────────
const SUPABASE_URL = "https://gpdihbkxacpfnpwdvfgw.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_BI2AZf0lFT4Mwd1nbFw9JA_Q85srW3C";

const supabaseClient = window.supabase.createClient(
  SUPABASE_URL,
  SUPABASE_ANON_KEY
);

let STATE = { items:[], catalogue:[], locations:[], prs:[], pls:[], mrs:[], indents:[], availableItems:[], externalLink: null };
let currentUser = null;
