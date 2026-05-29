import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { readFileSync } from 'fs'
import { join } from 'path'

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })

  const body = await request.json()
  const {
    nome_sistema,
    slogan,
    dominio,
    cor_primaria = '#2E7D32',
    cor_secundaria = '#FFC107',
    hospital_parceiro = '',
    email_suporte = '',
    whatsapp = '',
    canal_sorteio = '',
    admin_email,
  } = body

  let schema = ''
  let seed = ''
  try {
    schema = readFileSync(join(process.cwd(), 'supabase', 'schema-export.sql'), 'utf-8')
    seed = readFileSync(join(process.cwd(), 'supabase', 'seed-whitelabel.sql'), 'utf-8')
  } catch (e) {
    console.error('Erro ao ler SQLs:', e)
  }

  function escurecerCor(hex: string): string {
    const h = hex.replace('#', '')
    const r = Math.max(0, parseInt(h.slice(0, 2), 16) - 40)
    const g = Math.max(0, parseInt(h.slice(2, 4), 16) - 40)
    const b = Math.max(0, parseInt(h.slice(4, 6), 16) - 40)
    return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`
  }

  const corEscura = escurecerCor(cor_primaria)
  seed = seed
    .replace(/{{NOME_SISTEMA}}/g, nome_sistema || 'Sistema Cap')
    .replace(/{{SLOGAN}}/g, slogan || 'Filantropia Premiável')
    .replace(/{{COR_PRIMARIA}}/g, cor_primaria)
    .replace(/{{COR_SECUNDARIA}}/g, cor_secundaria)
    .replace(/{{COR_PRIMARIA_ESCURA}}/g, corEscura)
    .replace(/{{HOSPITAL_PARCEIRO}}/g, hospital_parceiro)
    .replace(/{{EMAIL_SUPORTE}}/g, email_suporte)
    .replace(/{{WHATSAPP}}/g, whatsapp)
    .replace(/{{CANAL_SORTEIO}}/g, canal_sorteio)

  const envVars = `# Variáveis de ambiente — ${nome_sistema}
# Cole no Vercel: Settings → Environment Variables

NEXT_PUBLIC_SUPABASE_URL=https://SEU_PROJECT_ID.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=SUA_ANON_KEY_AQUI
SUPABASE_SERVICE_ROLE_KEY=SUA_SERVICE_ROLE_KEY_AQUI
NEXT_PUBLIC_SITE_URL=https://${dominio}
NEXT_PUBLIC_ENV=production`

  const nomeLower = (nome_sistema || 'sistema').toLowerCase().replace(/\s/g, '-')
  const checklist = `# Checklist de Deploy — ${nome_sistema}
# Domínio: ${dominio}
# Gerado em: ${new Date().toLocaleDateString('pt-BR')}

## PASSO 1 — Criar projeto Supabase
[ ] Acesse supabase.com → New project
[ ] Nome: ${nomeLower}
[ ] Aguarde inicializar (~2 min)
[ ] Copie: Project URL, anon key e service_role key

## PASSO 2 — Executar SQL no Supabase
[ ] SQL Editor → Cole schema.sql → Run
[ ] SQL Editor → Cole seed.sql → Run
[ ] Confirme as tabelas em Table Editor

## PASSO 3 — Criar projeto no Vercel
[ ] vercel.com → Add New Project
[ ] Repositório: recife-cap (GitHub)
[ ] Configure as Environment Variables (arquivo env.txt)
[ ] Deploy!

## PASSO 4 — Configurar domínio
[ ] Vercel → Project → Settings → Domains
[ ] Adicione: ${dominio}
[ ] Configure DNS no registrador

## PASSO 5 — Criar usuário admin
[ ] Supabase → Authentication → Users → Add user
[ ] Email: ${admin_email || 'admin@' + dominio}
[ ] Atualize role para 'admin' na tabela profiles

## PASSO 6 — Configurar white label
[ ] Acesse: https://${dominio}/admin/configuracoes
[ ] Upload logo, cores, textos

## PASSO 7 — Testar
[ ] Site: https://${dominio}
[ ] Compra de título
[ ] Login admin
[ ] Criar edição e prêmios`

  return NextResponse.json({
    success: true,
    pacote: { schema_sql: schema, seed_sql: seed, env_vars: envVars, checklist },
  })
}
