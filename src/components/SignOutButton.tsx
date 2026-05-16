'use client';

import { useRouter } from 'next/navigation';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';

export default function SignOutButton() {
  const router = useRouter();
  const supabase = getSupabaseBrowserClient();

  return (
    <button
      onClick={async () => {
        await supabase.auth.signOut();
        router.refresh();
        router.push('/');
      }}
      className="rounded-md border border-neutral-300 px-3 py-1.5 text-sm hover:bg-neutral-100"
    >
      Sign out
    </button>
  );
}
