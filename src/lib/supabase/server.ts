import { createClient } from "@/utils/supabase/server";

export function createSupabaseServerClient() {
  return createClient();
}

export { createClient };
export default createClient;
