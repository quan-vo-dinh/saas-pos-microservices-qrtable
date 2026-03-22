import { NextRequest, NextResponse } from 'next/server';
import { getRoleHomeRoute, hasAccessToPath, parseRolesFromCookie } from '@/lib/auth/role-routing';

const AUTH_PATHS = ['/login', '/auth/callback'];
const PROTECTED_PREFIXES = ['/dashboard', '/pos', '/kds', '/admin'];

function isProtectedPath(pathname: string): boolean {
  return PROTECTED_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

function buildLoginRedirect(request: NextRequest): URL {
  const url = new URL('/login', request.url);
  const nextPath = request.nextUrl.pathname + request.nextUrl.search;
  if (nextPath && nextPath !== '/') {
    url.searchParams.set('next', nextPath);
  }
  return url;
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const roleCookie = request.cookies.get('qrtable_roles')?.value ?? request.cookies.get('qrtable_role')?.value;
  const roles = parseRolesFromCookie(roleCookie);

  if (pathname === '/') {
    if (!roles.length) {
      return NextResponse.redirect(new URL('/login', request.url));
    }
    return NextResponse.redirect(new URL(getRoleHomeRoute(roles), request.url));
  }

  if (AUTH_PATHS.some((path) => pathname === path || pathname.startsWith(`${path}/`))) {
    if (!roles.length) {
      return NextResponse.next();
    }
    return NextResponse.redirect(new URL(getRoleHomeRoute(roles), request.url));
  }

  if (!isProtectedPath(pathname)) {
    return NextResponse.next();
  }

  if (!roles.length) {
    return NextResponse.redirect(buildLoginRedirect(request));
  }

  if (!hasAccessToPath(pathname, roles)) {
    return NextResponse.redirect(new URL(getRoleHomeRoute(roles), request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)'],
};
