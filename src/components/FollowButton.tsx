'use client';

import { useTransition, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Bell, BellPlus } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { toggleFollow, type FollowTargetKind } from '@/app/follow/actions';

export default function FollowButton({
  targetKind,
  targetId,
  isSignedIn,
  initialFollowing,
  revalidate,
}: {
  targetKind: FollowTargetKind;
  targetId: string;
  isSignedIn: boolean;
  initialFollowing: boolean;
  revalidate?: string;
}) {
  const [isPending, startTransition] = useTransition();
  const [following, setFollowing] = useState(initialFollowing);
  const router = useRouter();

  if (!isSignedIn) {
    return (
      <a
        href="/auth"
        className="inline-flex h-7 items-center gap-1 rounded-lg border border-border bg-background px-2.5 text-[0.8rem] font-medium hover:bg-muted"
      >
        <BellPlus className="size-3.5" />
        Follow
      </a>
    );
  }

  return (
    <Button
      variant={following ? 'default' : 'outline'}
      size="sm"
      disabled={isPending}
      onClick={() => {
        startTransition(async () => {
          const res = await toggleFollow(targetKind, targetId, revalidate);
          if (!res.ok && res.error) {
            alert(res.error);
            return;
          }
          setFollowing(!!res.following);
          router.refresh();
        });
      }}
    >
      {following ? <Bell /> : <BellPlus />}
      {following ? 'Following' : 'Follow'}
    </Button>
  );
}
