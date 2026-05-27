import { NextResponse } from 'next/server'

export async function POST() {
  // Bucket criado manualmente no Supabase Dashboard
  return NextResponse.json({ ok: true })
}
