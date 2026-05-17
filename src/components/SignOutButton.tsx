'use client';

import { LogOut } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';

export default function SignOutButton() {
  const supabase = getSupabaseBrowserClient();

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={async () => {
        await supabase.auth.signOut();
        // Hard reload to discard all SSR caches and rebuild the layout as unauthenticated.
        window.location.assign('/');
      }}
    >
      <LogOut />
      Sign out
    </Button>
  );
}
