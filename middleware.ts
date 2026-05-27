import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

const ROLE_ROUTES: Record<string, string> = {
  admin:            '/admin/dashboard',
  distribuidor:     '/distribuidor/dashboard',
  pdv:              '/pdv/dashboard',
  cliente:          '/cliente/dashboard',
  motoboy:          '/motoboy/rotas',
  operador_sorteio: '/operador/sorteio',
  financeiro:       '/admin/relatorios',
  suporte:          '/admin/dashboard',
}

// Rotas que cada role pode acessar (além das suas próprias)
const ROLE_PREFIXES: Record<string, string[]> = {
  admin:            ['/admin', '/operador'],
  distribuidor:     ['/distribuidor'],
  pdv:              ['/pdv'],
  cliente:          ['/cliente'],
  motoboy:          ['/motoboy'],
  operador_sorteio: ['/operador', '/admin/sorteios'],
  financeiro:       ['/admin/relatorios', '/admin/distribuidores', '/admin/logs'],
  suporte:          ['/admin'],
}

const PUBLIC_ROUTES = ['/', '/login', '/auth/callback', '/cliente', '/api/cliente', '/api/config']

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { pathname } = request.nextUrl
  if (PUBLIC_ROUTES.some(r => pathname.startsWith(r))) return supabaseResponse

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  const { data: profile } = await supabase
    .from('profiles').select('role').eq('id', user.id).single()

  const role = profile?.role as string | undefined

  if (pathname === '/') {
    const url = request.nextUrl.clone()
    url.pathname = role ? (ROLE_ROUTES[role] ?? '/login') : '/login'
    return NextResponse.redirect(url)
  }

  if (role && role !== 'admin') {
    const allowedPrefixes = ROLE_PREFIXES[role] ?? []
    const allowed = allowedPrefixes.some(p => pathname.startsWith(p)) || pathname.startsWith('/api')
    if (!allowed) {
      const url = request.nextUrl.clone()
      url.pathname = ROLE_ROUTES[role] ?? '/login'
      return NextResponse.redirect(url)
    }
  }

  return supabaseResponse
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
}
