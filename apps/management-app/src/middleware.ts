import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { getRoleHomeRoute, hasAccessToPath, parseRoles } from '@/lib/auth/role-routing';
import { PROTECTED_PREFIXES, AUTH_PATHS, ROUTES } from '@/constants/routes';

function isProtectedPath(pathname: string): boolean {
  return PROTECTED_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

function buildSignInRedirect(request: NextRequest): URL {
  const url = new URL(ROUTES.LOGIN, request.url);
  const nextPath = request.nextUrl.pathname + request.nextUrl.search;
  url.searchParams.set('next', nextPath || '/');
  return url;
}

export default auth((request) => {
  const { pathname } = request.nextUrl;
  const roles = parseRoles(request.auth?.user?.roles);

  if (pathname === '/') {
    if (!roles.length) {
      return NextResponse.redirect(new URL(ROUTES.LOGIN, request.url));
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

  if (!request.auth) {
    return NextResponse.redirect(buildSignInRedirect(request));
  }

  if (!hasAccessToPath(pathname, roles)) {
    return NextResponse.redirect(new URL(getRoleHomeRoute(roles), request.url));
  }

  return NextResponse.next();
});

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)'],
};
