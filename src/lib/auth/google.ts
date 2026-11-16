import dns from 'node:dns';
import type { NextRequest } from 'next/server';

if (typeof dns.setDefaultResultOrder === 'function') {
  try {
    dns.setDefaultResultOrder('ipv4first');
  } catch {
    // Ignore in edge environments
  }
}

export type GoogleConfig = {
  clientId: string;
  clientSecret: string;
};

export type GoogleUserInfo = {
  sub: string;
  email: string;
  email_verified?: boolean;
  name?: string;
  given_name?: string;
  family_name?: string;
  picture?: string;
};

export function getAuthOrigin(request: NextRequest): string {
  // 1. Explicit APP_ORIGIN override
  if (process.env.APP_ORIGIN) {
    return process.env.APP_ORIGIN.trim().replace(/\/$/, '');
  }

  // 2. Forwarded headers from reverse proxies (Lando, Traefik, Nginx, Vercel)
  const forwardedHost = request.headers.get('x-forwarded-host');
  const forwardedProto = request.headers.get('x-forwarded-proto');

  // 3. Fall back to host header or request URL host
  let host =
    forwardedHost ||
    request.headers.get('host') ||
    request.nextUrl?.host ||
    new URL(request.url).host;

  const proto =
    forwardedProto ||
    (request.headers.get('x-forwarded-ssl') === 'on' ? 'https' : null) ||
    request.nextUrl?.protocol?.replace(':', '') ||
    new URL(request.url).protocol.replace(':', '') ||
    'http';

  // 4. Sanitize 0.0.0.0: never return 0.0.0.0 to a client browser or OAuth provider
  if (!host || host.startsWith('0.0.0.0')) {
    if (process.env.NEXT_PUBLIC_SITE_URL) {
      return process.env.NEXT_PUBLIC_SITE_URL.trim().replace(/\/$/, '');
    }
    host = host ? host.replace(/^0\.0\.0\.0/, 'localhost') : 'localhost:3000';
  }

  return `${proto}://${host}`;
}

function cleanEnv(val: string | undefined): string {
  if (!val) return '';
  return val.trim().replace(/^["']|["']$/g, '').trim();
}

export function getGoogleConfig(): GoogleConfig | null {
  const clientId =
    cleanEnv(process.env.AUTH_GOOGLE_ID) ||
    cleanEnv(process.env.GOOGLE_CLIENT_ID);
  const clientSecret =
    cleanEnv(process.env.AUTH_GOOGLE_SECRET) ||
    cleanEnv(process.env.GOOGLE_CLIENT_SECRET);

  if (!clientId || !clientSecret) {
    return null;
  }

  return { clientId, clientSecret };
}

export function buildGoogleAuthUrl({
  clientId,
  redirectUri,
  state,
}: {
  clientId: string;
  redirectUri: string;
  state: string;
}): string {
  const url = new URL('https://accounts.google.com/o/oauth2/v2/auth');
  url.searchParams.set('client_id', clientId);
  url.searchParams.set('redirect_uri', redirectUri);
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('scope', 'openid email profile');
  url.searchParams.set('state', state);
  url.searchParams.set('access_type', 'online');
  url.searchParams.set('prompt', 'select_account');
  return url.toString();
}

export async function exchangeGoogleCode({
  code,
  clientId,
  clientSecret,
  redirectUri,
}: {
  code: string;
  clientId: string;
  clientSecret: string;
  redirectUri: string;
}): Promise<{ access_token: string; id_token?: string }> {
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: 'authorization_code',
    }),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.access_token) {
    throw new Error(data.error_description || data.error || 'Failed to exchange Google auth code');
  }

  return {
    access_token: data.access_token,
    id_token: data.id_token,
  };
}

export async function getGoogleUserInfo(accessToken: string): Promise<GoogleUserInfo> {
  const res = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.email) {
    throw new Error(data.error_description || data.error || 'Failed to fetch Google profile');
  }

  return data as GoogleUserInfo;
}
