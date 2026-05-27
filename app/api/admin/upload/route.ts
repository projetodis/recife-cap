import { createClient } from '@supabase/supabase-js'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )

  const formData = await req.formData()
  const file  = formData.get('file') as File
  const chave = formData.get('chave') as string

  if (!file || !chave) {
    return NextResponse.json({ error: 'Arquivo ou chave ausente' }, { status: 400 })
  }
  if (!file.type.startsWith('image/')) {
    return NextResponse.json({ error: 'Apenas imagens são permitidas' }, { status: 400 })
  }
  if (file.size > 5 * 1024 * 1024) {
    return NextResponse.json({ error: 'Máximo 5MB' }, { status: 400 })
  }

  const ext      = file.name.split('.').pop()?.toLowerCase() || 'png'
  const fileName = `${chave.replace(/_/g, '-')}-${Date.now()}.${ext}`

  const buffer = Buffer.from(await file.arrayBuffer())

  const { data, error } = await supabaseAdmin.storage
    .from('midias')
    .upload(fileName, buffer, { contentType: file.type, upsert: true, cacheControl: '3600' })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const { data: urlData } = supabaseAdmin.storage.from('midias').getPublicUrl(data.path)

  return NextResponse.json({ url: urlData.publicUrl })
}
