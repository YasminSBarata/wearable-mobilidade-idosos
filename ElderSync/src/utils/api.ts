import { checkSession } from "./supabase/client";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export async function apiFetch(path: string, options: RequestInit = {}) {
  const { session, error } = await checkSession();

  if (error || !session?.access_token) {
    throw new Error("not_authenticated");
  }

  const res = await fetch(`${supabaseUrl}/functions/v1${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${session.access_token}`,
      apikey: supabaseAnonKey,
      ...(options.headers ?? {}),
    },
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || `HTTP ${res.status}`);
  }

  return res.json();
}
