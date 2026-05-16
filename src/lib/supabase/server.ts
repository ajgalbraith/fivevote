import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';

export async function getSupabaseServerClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(toSet) {
          try {
            toSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // setAll may be called from a Server Component where mutation is not allowed.
            // Middleware refreshes cookies, so this is safe to ignore here.
          }
        },
      },
    },
  );
}
