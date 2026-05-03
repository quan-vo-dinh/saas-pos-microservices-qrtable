import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { fetchAuthorizerMe } from '@/lib/auth/bff-server';

export async function GET() {
  const session = await auth();

  if (!session?.accessToken) {
    return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
  }

  let profile;
  try {
    profile = await fetchAuthorizerMe(session.accessToken, session.user?.tenantId);
  } catch {
    return NextResponse.json({ error: 'BFF_UNREACHABLE' }, { status: 503 });
  }

  if (!profile) {
    return NextResponse.json({ error: 'PROFILE_UNAVAILABLE' }, { status: 401 });
  }

  return NextResponse.json(profile);
}
