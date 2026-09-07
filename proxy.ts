// middleware.ts
import { NextRequest, NextResponse } from 'next/server';
import { CognitoJwtVerifier } from 'aws-jwt-verify';

const verifier = CognitoJwtVerifier.create({
  userPoolId: process.env.COGNITO_USER_POOL_ID!,
  tokenUse: 'access',
  clientId: process.env.COGNITO_CLIENT_ID!,
});

const PUBLIC_ROUTES = ['/auth/login', '/auth/signup', '/auth/confirm', '/auth/mfa'];

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (PUBLIC_ROUTES.some((r) => pathname.startsWith(r))) {
    return NextResponse.next();
  }

  const accessToken = request.cookies.get('accessToken')?.value ?? request.cookies.get('access_token')?.value;

  if (!accessToken) {
    return NextResponse.redirect(new URL('/auth/login', request.url));
  }

  try {
    await verifier.verify(accessToken);
    return NextResponse.next();
  } catch {
    // Token expired — attempt silent refresh
    const refreshResponse = await fetch(new URL('/api/auth/refresh', request.url), {
      method: 'POST',
      headers: { cookie: request.headers.get('cookie') || '' },
    });

    if (refreshResponse.ok) {
      const res = NextResponse.next();
      // Forward the refreshed auth cookies from the refresh response.
      refreshResponse.headers.getSetCookie().forEach((cookie) => {
        res.headers.append('Set-Cookie', cookie);
      });
      return res;
    }

    return NextResponse.redirect(new URL('/auth/login', request.url));
  }
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|api/auth|.*\\.(?:png|jpg|jpeg|svg|gif|webp|ico)$).*)',
  ],
};
