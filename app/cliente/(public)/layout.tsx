import { getConfigs } from '@/lib/config'

export default async function PublicClienteLayout({ children }: { children: React.ReactNode }) {
  const configs = await getConfigs()

  return (
    <>
      <style>{`
        :root {
          --color-primary: ${configs.cor_primaria || '#2E7D32'};
          --color-secondary: ${configs.cor_secundaria || '#FFC107'};
        }
      `}</style>
      {children}
    </>
  )
}
