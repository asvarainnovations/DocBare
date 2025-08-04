import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';

export async function middleware(request: NextRequest) {
  // Check if the request is for admin routes
  if (request.nextUrl.pathname.startsWith('/admin')) {
    // Allow access to signup page with valid invite
    if (request.nextUrl.pathname === '/admin/signup') {
      const inviteCode = request.nextUrl.searchParams.get('invite');
      if (!inviteCode) {
        return NextResponse.redirect(new URL('/', request.url));
      }
      return NextResponse.next();
    }

    // Check for authentication token
    const token = await getToken({ 
      req: request, 
      secret: process.env.NEXTAUTH_SECRET 
    });

    // If no token, redirect to login
    if (!token) {
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('callbackUrl', request.nextUrl.pathname);
      return NextResponse.redirect(loginUrl);
    }

    // For admin routes, we need to check if the user is an admin
    // Since middleware can't directly access the database, we'll check this in the API routes
    // The middleware ensures the user is authenticated, and the API routes verify admin status
    
    return NextResponse.next();
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
}; 