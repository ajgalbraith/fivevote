import { NextResponse, type NextRequest } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const next = requestUrl.searchParams.get('next') ?? '/';

  if (code) {
    const supabase = await getSupabaseServerClient();
    await supabase.auth.exchangeCodeForSession(code);
  }

  // On Render, request.url is the internal http://localhost:10000/... URL.
  // Reconstruct the public origin from forwarded headers, or fall back to a configured site URL.
  const proto = request.headers.get('x-forwarded-proto') ?? requestUrl.protocol.replace(':', '');
  const host = request.headers.get('x-forwarded-host') ?? request.headers.get('host') ?? requestUrl.host;
  const origin = process.env.NEXT_PUBLIC_SITE_URL ?? `${proto}://${host}`;

  return NextResponse.redirect(`${origin}${next}`);
}
