import { NextRequest, NextResponse } from 'next/server';

const STATE_NAMES: Record<string, string> = {
  montana: 'Montana',
  washington: 'Washington',
  oregon: 'Oregon',
  idaho: 'Idaho',
  wyoming: 'Wyoming',
  colorado: 'Colorado',
};

function getEnabledStates(): string[] {
  const raw = process.env.ENABLED_STATES ?? 'montana';
  return raw
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
}

function isLocalhost(hostname: string): boolean {
  return hostname === 'localhost' || hostname.endsWith('.localhost');
}

function isRootDomain(hostname: string): boolean {
  return (
    hostname === 'garageroute.com' ||
    hostname === 'www.garageroute.com' ||
    hostname === 'garageroute.com:3000' ||
    hostname === 'localhost:3000' ||
    hostname === 'localhost:3001'
  );
}

function extractStateSlug(hostname: string): string | null {
  if (isLocalhost(hostname) || isRootDomain(hostname)) {
    return null;
  }

  const clean = hostname.split(':')[0];
  if (!clean.endsWith('.garageroute.com')) {
    return null;
  }

  const parts = clean.split('.');
  if (parts.length !== 3) {
    return null;
  }

  const slug = parts[0].toLowerCase();
  return slug || null;
}

export function proxy(req: NextRequest) {
  const hostname = req.nextUrl.hostname;

  // Localhost dev bypasses subdomain logic.
  if (isLocalhost(hostname)) {
    return NextResponse.next();
  }

  const slug = extractStateSlug(hostname);
  if (!slug) {
    return NextResponse.next();
  }

  const enabled = getEnabledStates();
  if (!enabled.includes(slug)) {
    return NextResponse.redirect(
      new URL('/states', 'https://garageroute.com'),
      307,
    );
  }

  const requestHeaders = new Headers(req.headers);
  requestHeaders.set('x-state-slug', slug);
  requestHeaders.set('x-state-name', STATE_NAMES[slug] ?? slug);

  return NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\..*).*)'],
};
