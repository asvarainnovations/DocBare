import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
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

    // For now, we'll allow access to admin routes
    // In a real implementation, you would check for admin authentication here
    // Example:
    // const session = await getServerSession(authOptions);
    // if (!session) {
    //   return NextResponse.redirect(new URL('/login', request.url));
    // }
    // 
    // const isAdmin = await prisma.admin.findUnique({
    //   where: { userId: session.user.id, active: true }
    // });
    // if (!isAdmin) {
    //   return NextResponse.redirect(new URL('/', request.url));
    // }
    
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