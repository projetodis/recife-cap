// Banner visível apenas no ambiente de staging
// Para que você saiba que está testando e não em produção

export default function StagingBanner() {
  if (process.env.NEXT_PUBLIC_ENV !== 'staging') return null

  return (
    <div className="fixed top-0 left-0 right-0 z-[9999] flex items-center justify-center py-1.5 text-xs font-black"
      style={{ background: '#FF6B00', color: 'white' }}>
      ⚠️ AMBIENTE DE STAGING — Alterações aqui NÃO afetam produção
    </div>
  )
}
