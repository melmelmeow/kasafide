import { createBrowserClient } from "@supabase/ssr";

const DEFAULT_SUPABASE_URL = "https://srv1824055.hstgr.cloud";
const DEFAULT_SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiYW5vbiIsImlzcyI6InN1cGFiYXNlIiwiaWF0IjoxNzgzODYyNzgyLCJleHAiOjIwOTkyMjI3ODJ9.VZhJGJ7CG4NJpdcIoSAGLjsWiGrh491UpAhtjem15tw";

export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || DEFAULT_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || DEFAULT_SUPABASE_ANON_KEY;

  return createBrowserClient(url, key);
}
