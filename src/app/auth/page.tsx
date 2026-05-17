import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import AuthForm from '@/components/AuthForm';

export const dynamic = 'force-dynamic';

export default async function AuthPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;
  return (
    <div className="mx-auto max-w-sm">
      <Card>
        <CardHeader>
          <CardTitle>Sign in to FiveVote</CardTitle>
          <CardDescription>
            We send a one-time magic link. No password required.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <AuthForm next={next ?? '/'} />
        </CardContent>
      </Card>
    </div>
  );
}
