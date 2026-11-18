import 'server-only';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const DEFAULT_SUPABASE_URL = "https://srv1824055.hstgr.cloud";
const DEFAULT_SUPABASE_ROLE_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoic2VydmljZV9yb2xlIiwiaXNzIjoic3VwYWJhc2UiLCJpYXQiOjE3ODM4NjI3ODIsImV4cCI6MjA5OTIyMjc4Mn0.oaoBBskp7BnHsLtQJBtl1qhycdmNA_uLSbJMSrgqWD8";

let _adminClient: SupabaseClient | null = null;

// Support all variable names used across Carey / Slick2 commits:
// SUPABASE_ROLE_KEY, NEXT_PUBLIC_SUPABASE_ROLE_KEY, and SUPABASE_SERVICE_ROLE_KEY
export function getAdminClient(): SupabaseClient {
  if (!_adminClient) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || DEFAULT_SUPABASE_URL;
    const supabaseRoleKey =
      process.env.SUPABASE_ROLE_KEY ||
      process.env.NEXT_PUBLIC_SUPABASE_ROLE_KEY ||
      process.env.SUPABASE_SERVICE_ROLE_KEY ||
      DEFAULT_SUPABASE_ROLE_KEY;

    _adminClient = createClient(supabaseUrl, supabaseRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });
  }
  return _adminClient;
}

export function getAdminSupabase(): SupabaseClient {
  return getAdminClient();
}

export const adminClient = new Proxy({} as SupabaseClient, {
  get(_target, prop) {
    const client = getAdminClient();
    const val = (client as any)[prop];
    if (typeof val === 'function') {
      return val.bind(client);
    }
    return val;
  },
});

export const createAdminClient = () => getAdminClient();
export default adminClient;
