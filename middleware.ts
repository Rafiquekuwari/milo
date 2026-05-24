import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname

  // Only protect the root / — everything else is handled client-side
  // This allows offline-cached pages to load without server auth checks
  if (path === '/') {
    const hasSession = request.cookies.getAll().some(
      c => c.name.startsWith('sb-') && c.name.endsWith('-auth-token')
    )
    if (!hasSession) {
      return NextResponse.redirect(new URL('/auth', request.url))
    }
  }

  return NextResponse.next()
}

export const config = {
  // Only run middleware on root — not on any app pages
  matcher: ['/'],
}