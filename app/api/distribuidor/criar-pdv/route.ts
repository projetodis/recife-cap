import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

function adminSB() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  )
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'distribuidor')
    return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })

  const { data: dist } = await supabase
    .from('distribuidores').select('id').eq('user_id', user.id).single()
  if (!dist) return NextResponse.json({ error: 'Distribuidor não encontrado' }, { status: 404 })

  let body: {
    nome: string; responsavel_nome: string; telefone: string
    email: string; senha: string
    cep: string; logradouro: string; numero: string; complemento: string
    bairro: string; cidade: string; uf: string
    regiao: string | null; latitude: number | null; longitude: number | null
    maps_url: string | null; comissao_pct: number
  }

  try { body = await request.json() }
  catch { return NextResponse.json({ error: 'Body inválido' }, { status: 400 }) }

  const { nome, responsavel_nome, telefone, email, senha, comissao_pct } = body

  if (!nome?.trim())            return NextResponse.json({ error: 'Nome obrigatório' }, { status: 400 })
  if (!email?.trim())           return NextResponse.json({ error: 'Email obrigatório' }, { status: 400 })
  if (!senha || senha.length < 6) return NextResponse.json({ error: 'Senha mínima 6 caracteres' }, { status: 400 })

  const admin = adminSB()

  // 1. Criar usuário Auth
  const { data: authData, error: authErr } = await admin.auth.admin.createUser({
    email: email.trim().toLowerCase(),
    password: senha,
    email_confirm: true,
    user_metadata: { role: 'pdv', nome: responsavel_nome },
  })

  if (authErr || !authData?.user)
    return NextResponse.json({ error: authErr?.message ?? 'Erro ao criar usuário' }, { status: 500 })

  const novoUserId = authData.user.id

  // 2. Upsert profile com role pdv
  const { error: profileErr } = await admin.from('profiles').upsert({
    id:       novoUserId,
    role:     'pdv',
    nome:     responsavel_nome?.trim() ?? '',
    telefone: telefone?.replace(/\D/g, '') ?? '',
  })

  if (profileErr) {
    await admin.auth.admin.deleteUser(novoUserId)
    return NextResponse.json({ error: 'Erro ao criar perfil: ' + profileErr.message }, { status: 500 })
  }

  // 3. Inserir PDV
  const logradouro = body.logradouro?.trim() ?? ''
  const numero     = body.numero?.trim() ?? ''

  const { data: pdv, error: pdvErr } = await admin.from('pontos_de_venda').insert({
    distribuidor_id:   dist.id,
    responsavel_id:    novoUserId,
    email_responsavel: email.trim().toLowerCase(),
    nome:              nome.trim(),
    responsavel_nome:  responsavel_nome?.trim() ?? '',
    telefone:          telefone?.replace(/\D/g, '') ?? '',
    cep:               body.cep?.replace(/\D/g, '') ?? '',
    endereco:          logradouro + (numero ? ', ' + numero : ''),
    numero,
    complemento:       body.complemento?.trim() ?? '',
    bairro:            body.bairro?.trim() ?? '',
    cidade:            body.cidade?.trim() ?? '',
    uf:                body.uf?.trim() ?? '',
    regiao:            body.regiao ?? null,
    latitude:          body.latitude ?? null,
    longitude:         body.longitude ?? null,
    maps_url:          body.maps_url ?? null,
    comissao_pct:      comissao_pct ?? 10,
    status:            'ativo',
  }).select('id').single()

  if (pdvErr || !pdv) {
    await admin.auth.admin.deleteUser(novoUserId)
    return NextResponse.json({ error: 'Erro ao criar PDV: ' + (pdvErr?.message ?? '') }, { status: 500 })
  }

  return NextResponse.json({ success: true, pdv_id: pdv.id })
}
