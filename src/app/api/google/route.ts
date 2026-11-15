import { NextRequest } from 'next/server';
import { GET as authGoogleGet } from '@/app/api/auth/google/route';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  return authGoogleGet(request);
}
