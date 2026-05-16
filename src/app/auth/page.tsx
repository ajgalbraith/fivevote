import AuthForm from '@/components/AuthForm';

export const dynamic = 'force-dynamic';

export default async function AuthPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;
  return (
    <div className="mx-auto max-w-sm space-y-4">
      <h1 className="text-2xl font-semibold">Sign in to FiveVote</h1>
      <p className="text-sm text-neutral-600">
        We send a one-time magic link. No password required.
      </p>
      <AuthForm next={next ?? '/'} />
    </div>
  );
}
