'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Lock } from 'lucide-react'

interface Form {
  nome: string
  responsavel_nome: string
  telefone: string
  email: string
  senha: string
  cep: string
  logradouro: string
  numero: string
  complemento: string
  bairro: string
  cidade: string
  regiao: string
  uf: string
  comissao_pct: string
  latitude: string
  longitude: string
}

const FORM_INICIAL: Form = {
  nome: '', responsavel_nome: '', telefone: '',
  email: '', senha: '',
  cep: '', logradouro: '', numero: '', complemento: '',
  bairro: '', cidade: '', regiao: '', uf: '',
  comissao_pct: '5',
  latitude: '', longitude: '',
}

function mascaraCep(v: string) {
  const d = v.replace(/\D/g, '').slice(0, 8)
  return d.length > 5 ? `${d.slice(0, 5)}-${d.slice(5)}` : d
}

function mascaraTelefone(v: string) {
  const d = v.replace(/\D/g, '').slice(0, 11)
  if (d.length <= 2)  return `(${d}`
  if (d.length <= 7)  return `(${d.slice(0, 2)}) ${d.slice(2)}`
  if (d.length <= 11) return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`
  return v
}

export default function NovoPDVPage() {
  const router = useRouter()

  const [form, setForm] = useState<Form>(FORM_INICIAL)
  const [carregando, setCarregando]   = useState(false)
  const [buscandoCep, setBuscandoCep] = useState(false)
  const [buscandoGeo, setBuscandoGeo] = useState(false)
  const [buscandoEnd, setBuscandoEnd] = useState(false)
  const [erro, setErro]     = useState('')
  const [sucesso, setSucesso] = useState('')

  function set(field: keyof Form, value: string) {
    setForm(f => ({ ...f, [field]: value }))
  }

  /* ── CEP ── */
  async function handleCep(raw: string) {
    const mascarado = mascaraCep(raw)
    set('cep', mascarado)

    const digitos = raw.replace(/\D/g, '')
    if (digitos.length !== 8) return

    setBuscandoCep(true)
    try {
      const res  = await fetch(`https://viacep.com.br/ws/${digitos}/json/`)
      const data = await res.json()
      if (data.erro) { setErro('CEP não encontrado.'); return }
      setForm(f => ({
        ...f,
        logradouro: data.logradouro ?? '',
        bairro:     data.bairro     ?? '',
        cidade:     data.localidade ?? '',
        uf:         data.uf         ?? '',
      }))
      setErro('')
    } catch {
      setErro('Erro ao buscar CEP.')
    } finally {
      setBuscandoCep(false)
    }
  }

  /* ── GPS ── */
  async function usarMinhaLocalizacao() {
    setBuscandoGeo(true)
    setErro('')
    setSucesso('')

    async function aplicarLocalizacao(lat: string, lng: string) {
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`,
          { headers: { 'Accept-Language': 'pt-BR' } }
        )
        const data = await res.json()
        const addr = data.address ?? {}
        setForm(f => ({
          ...f,
          latitude:   lat,
          longitude:  lng,
          logradouro: addr.road ?? addr.pedestrian ?? f.logradouro,
          bairro:     addr.suburb ?? addr.neighbourhood ?? addr.quarter ?? f.bairro,
          cidade:     addr.city ?? addr.town ?? addr.municipality ?? f.cidade,
          uf:         addr.state_code ?? (addr.ISO3166_2_lvl4 ? addr.ISO3166_2_lvl4.replace('BR-', '') : undefined) ?? f.uf,
        }))
        setSucesso(`Localização capturada: ${addr.city ?? addr.town}, ${addr.state}`)
      } catch {
        setForm(f => ({ ...f, latitude: lat, longitude: lng }))
        setSucesso(`Localização capturada: ${Number(lat).toFixed(6)}, ${Number(lng).toFixed(6)}`)
      }
    }

    if (navigator.geolocation) {
      const gpsPromise = new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: false,
          timeout: 8000,
          maximumAge: 60000,
        })
      })
      try {
        const pos = await gpsPromise
        await aplicarLocalizacao(pos.coords.latitude.toString(), pos.coords.longitude.toString())
        setBuscandoGeo(false)
        return
      } catch { /* GPS falhou, tenta por IP */ }
    }

    try {
      const res = await fetch('https://ipapi.co/json/')
      const data = await res.json()
      if (data.latitude && data.longitude) {
        await aplicarLocalizacao(String(data.latitude), String(data.longitude))
      } else {
        setErro('Não foi possível obter localização. Use "Buscar endereço no mapa".')
      }
    } catch {
      setErro('Não foi possível obter localização. Digite o CEP e use "Buscar endereço no mapa".')
    }

    setBuscandoGeo(false)
  }

  /* ── Busca por endereço ── */
  async function buscarEnderecoNoMapa() {
    const { logradouro, numero, bairro, cidade } = form
    if (!logradouro || !cidade) {
      setErro('Preencha ao menos o logradouro e a cidade para buscar no mapa.')
      return
    }
    setBuscandoEnd(true)
    setErro('')
    try {
      const query = encodeURIComponent(
        [logradouro, numero, bairro, cidade, 'Brasil'].filter(Boolean).join(', ')
      )
      const res  = await fetch(`https://nominatim.openstreetmap.org/search?q=${query}&format=json&limit=1`)
      const data = await res.json()
      if (!data.length) { setErro('Endereço não encontrado. Tente ser mais específico.'); return }
      setForm(f => ({ ...f, latitude: data[0].lat, longitude: data[0].lon }))
      setSucesso(`Endereço localizado: ${data[0].display_name}`)
    } catch {
      setErro('Erro ao buscar endereço no mapa.')
    } finally {
      setBuscandoEnd(false)
    }
  }

  /* ── Submit → API ── */
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setErro('')
    setCarregando(true)

    try {
      const response = await fetch('/api/distribuidor/criar-pdv', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nome:             form.nome,
          responsavel_nome: form.responsavel_nome,
          telefone:         form.telefone,
          email:            form.email,
          senha:            form.senha,
          cep:              form.cep,
          logradouro:       form.logradouro,
          numero:           form.numero,
          complemento:      form.complemento,
          bairro:           form.bairro,
          cidade:           form.cidade,
          uf:               form.uf,
          regiao:           form.regiao || null,
          latitude:         form.latitude  ? parseFloat(form.latitude)  : null,
          longitude:        form.longitude ? parseFloat(form.longitude) : null,
          maps_url:         form.latitude  ? `https://maps.google.com/?q=${form.latitude},${form.longitude}` : null,
          comissao_pct:     parseFloat(form.comissao_pct),
        }),
      })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || 'Erro ao criar PDV')
      setSucesso('PDV criado com sucesso!')
      setTimeout(() => router.push('/distribuidor/pdvs'), 1200)
    } catch (err: unknown) {
      setErro(err instanceof Error ? err.message : 'Erro ao criar PDV.')
    } finally {
      setCarregando(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto pb-16">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-gray-900">Cadastrar PDV</h1>
        <p className="text-sm text-gray-500 mt-1">Adicione um novo ponto de venda à sua rede</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">

        {/* ── LOCALIZAÇÃO ── */}
        <section className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-sm font-semibold text-gray-900 mb-1">Localização no mapa</h2>
          <p className="text-xs text-gray-400 mb-4">
            Necessário para o mapa de PDVs e rotas do motoboy
          </p>

          <div className="flex gap-3 mb-4">
            <button
              type="button"
              onClick={usarMinhaLocalizacao}
              disabled={buscandoGeo || buscandoEnd}
              className="flex-1 px-4 py-2.5 text-sm border border-emerald-200 text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-lg transition disabled:opacity-50 font-medium"
            >
              {buscandoGeo ? 'Capturando...' : 'Estou aqui agora'}
            </button>
            <button
              type="button"
              onClick={buscarEnderecoNoMapa}
              disabled={buscandoEnd || buscandoGeo}
              className="flex-1 px-4 py-2.5 text-sm border border-blue-200 text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg transition disabled:opacity-50 font-medium"
            >
              {buscandoEnd ? 'Buscando...' : 'Buscar endereço no mapa'}
            </button>
          </div>

          {form.latitude && form.longitude && (
            <div className="mt-3 p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
              <p className="text-xs text-emerald-700 font-medium">Localização definida</p>
              <p className="text-xs text-emerald-600 mt-1">
                Lat: {form.latitude} · Lng: {form.longitude}
              </p>
              <a
                href={`https://maps.google.com/?q=${form.latitude},${form.longitude}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-emerald-600 underline mt-1 inline-block"
              >
                Ver no Google Maps →
              </a>
              <button
                type="button"
                onClick={() => setForm(f => ({ ...f, latitude: '', longitude: '' }))}
                className="ml-4 text-xs text-red-500 hover:text-red-700"
              >
                Remover
              </button>
            </div>
          )}
        </section>

        {/* ── DADOS DO PONTO ── */}
        <section className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-sm font-semibold text-gray-900 mb-4">Dados do ponto</h2>
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-xs text-gray-500 mb-1.5">Nome do estabelecimento *</label>
              <input
                type="text"
                value={form.nome}
                onChange={e => set('nome', e.target.value)}
                placeholder="Ex: Bar do Zé, Mercado Silva..."
                required
                className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1.5">Nome do responsável *</label>
              <input
                type="text"
                value={form.responsavel_nome}
                onChange={e => set('responsavel_nome', e.target.value)}
                placeholder="Nome do responsável"
                required
                className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1.5">Telefone</label>
              <input
                type="text"
                value={form.telefone}
                onChange={e => set('telefone', mascaraTelefone(e.target.value))}
                placeholder="(81) 99999-9999"
                className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition"
              />
            </div>
          </div>
        </section>

        {/* ── ENDEREÇO ── */}
        <section className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-sm font-semibold text-gray-900 mb-4">Endereço</h2>
          <div className="grid grid-cols-2 gap-4">

            <div>
              <label className="block text-xs text-gray-500 mb-1.5">
                CEP {buscandoCep && <span className="text-emerald-600">— buscando...</span>}
              </label>
              <input
                type="text"
                value={form.cep}
                onChange={e => handleCep(e.target.value)}
                placeholder="00000-000"
                maxLength={9}
                className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition"
              />
            </div>

            <div>
              <label className="block text-xs text-gray-500 mb-1.5">UF</label>
              <input
                type="text"
                value={form.uf}
                onChange={e => set('uf', e.target.value.toUpperCase().slice(0, 2))}
                placeholder="PE"
                maxLength={2}
                className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition"
              />
            </div>

            <div className="col-span-2">
              <label className="block text-xs text-gray-500 mb-1.5">Logradouro *</label>
              <input
                type="text"
                value={form.logradouro}
                onChange={e => set('logradouro', e.target.value)}
                placeholder="Rua, Av., Travessa..."
                required
                className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition"
              />
            </div>

            <div>
              <label className="block text-xs text-gray-500 mb-1.5">Número *</label>
              <input
                type="text"
                value={form.numero}
                onChange={e => set('numero', e.target.value)}
                placeholder="123"
                required
                className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition"
              />
            </div>

            <div>
              <label className="block text-xs text-gray-500 mb-1.5">Complemento</label>
              <input
                type="text"
                value={form.complemento}
                onChange={e => set('complemento', e.target.value)}
                placeholder="Apto, sala, loja..."
                className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition"
              />
            </div>

            <div>
              <label className="block text-xs text-gray-500 mb-1.5">Bairro</label>
              <input
                type="text"
                value={form.bairro}
                onChange={e => set('bairro', e.target.value)}
                placeholder="Bairro"
                className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition"
              />
            </div>

            <div>
              <label className="block text-xs text-gray-500 mb-1.5">Cidade *</label>
              <input
                type="text"
                value={form.cidade}
                onChange={e => set('cidade', e.target.value)}
                placeholder="Recife, Caruaru..."
                required
                className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition"
              />
            </div>

            <div>
              <label className="block text-xs text-gray-500 mb-1.5">Região / Zona</label>
              <input
                type="text"
                value={form.regiao}
                onChange={e => set('regiao', e.target.value)}
                placeholder="Ex: Zona Norte, Centro..."
                className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>
        </section>

        {/* ── CONFIGURAÇÕES ── */}
        <section className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-sm font-semibold text-gray-900 mb-4">Configurações</h2>
          <div className="max-w-xs">
            <label className="block text-xs text-gray-500 mb-1.5">Comissão do PDV (%)</label>
            <input
              type="number"
              value={form.comissao_pct}
              onChange={e => set('comissao_pct', e.target.value)}
              min="0"
              max="100"
              step="0.5"
              className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition"
            />
            <p className="text-xs text-gray-400 mt-1.5">
              Percentual sobre cada venda que o PDV recebe
            </p>
          </div>
        </section>

        {/* ── ACESSO DO LOJISTA ── */}
        <section className="bg-white rounded-xl border-2 border-red-500 p-6">
          <h2 className="text-sm font-semibold text-gray-900 mb-1 flex items-center gap-2">
            <Lock size={15} className="text-emerald-600" />
            Acesso do lojista
          </h2>
          <p className="text-xs text-gray-400 mb-4">
            Crie as credenciais para o responsável acessar o painel PDV
          </p>
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2 sm:col-span-1">
              <label className="block text-xs text-gray-500 mb-1.5">Email *</label>
              <input
                type="email"
                value={form.email}
                onChange={e => set('email', e.target.value)}
                placeholder="email@exemplo.com"
                required
                className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition"
              />
            </div>
            <div className="col-span-2 sm:col-span-1">
              <label className="block text-xs text-gray-500 mb-1.5">Senha *</label>
              <input
                type="password"
                value={form.senha}
                onChange={e => set('senha', e.target.value)}
                placeholder="Mínimo 6 caracteres"
                required
                minLength={6}
                className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition"
              />
            </div>
          </div>
        </section>

        {/* ── FEEDBACK ── */}
        {erro && (
          <div className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-4 py-3">
            {erro}
          </div>
        )}
        {sucesso && (
          <div className="text-sm text-emerald-600 bg-emerald-50 border border-emerald-100 rounded-lg px-4 py-3">
            {sucesso}
          </div>
        )}

        {/* ── AÇÕES ── */}
        <div className="flex gap-3 pb-4">
          <button
            type="button"
            onClick={() => router.back()}
            className="px-5 py-2.5 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={carregando}
            className="px-7 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 text-white text-sm font-medium rounded-lg transition"
          >
            {carregando ? 'Criando...' : 'Criar PDV'}
          </button>
        </div>

      </form>
    </div>
  )
}
