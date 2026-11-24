import { Button } from '@/components/common/Button'
import { getSupabase } from '@/lib/supabase'
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'

const MOLDES_BASE = '/moldes-importacao'

const cards = [
  {
    title: 'Produtos',
    desc: 'Cadastro de peças (SKU, nome, categoria/grupo). Novos entram como draft.',
    to: '/admin/produtos/importar',
    molde: `${MOLDES_BASE}/01_produtos.csv`,
  },
  {
    title: 'Aplicações',
    desc: 'Compatibilidade veículo × produto. SKU precisa existir — apps não criam produto.',
    to: '/admin/produtos/importar-aplicacoes',
    molde: `${MOLDES_BASE}/02_aplicacoes.csv`,
  },
  {
    title: 'Bundle HF',
    desc: 'Arquivo único: produtos + aplicações na mesma planilha.',
    to: '/admin/produtos/importar-hf',
    molde: `${MOLDES_BASE}/03_bundle_hf.csv`,
  },
  {
    title: 'Imagens por código',
    desc: 'Upload em lote: nome do arquivo = SKU / fabricante / referência (ex.: SKU.jpg).',
    to: '/admin/produtos/importar-imagens',
    molde: null,
  },
  {
    title: 'Conversões',
    desc: 'Código HF ↔ código do fornecedor (supplier_products).',
    to: '/admin/fornecedores/importar-conversoes',
    molde: `${MOLDES_BASE}/04_conversoes_fornecedor.csv`,
  },
  {
    title: 'Custos',
    desc: 'Custo por código do fornecedor. HF-SUP-01 usa o SKU do produto.',
    to: '/admin/fornecedores/importar-custos',
    molde: `${MOLDES_BASE}/05_custos_fornecedor.csv`,
  },
  {
    title: 'Preços',
    desc: 'Listas de preço (admin interno). Não aparece na vitrine B2B.',
    to: '/admin/precos',
    molde: `${MOLDES_BASE}/06_lista_precos.csv`,
  },
] as const

type ImportRow = {
  id: string
  kind: string | null
  status: string | null
  file_name: string | null
  filename: string | null
  created_at: string
}

export function AdminImportsHubPage() {
  const [history, setHistory] = useState<ImportRow[]>([])
  const [historyError, setHistoryError] = useState<string | null>(null)

  useEffect(() => {
    void (async () => {
      try {
        const { data, error } = await getSupabase()
          .from('imports')
          .select('id, kind, status, file_name, filename, created_at')
          .order('created_at', { ascending: false })
          .limit(30)
        if (error) throw error
        setHistory((data ?? []) as ImportRow[])
      } catch (e) {
        setHistoryError(e instanceof Error ? e.message : 'Falha ao carregar histórico')
      }
    })()
  }, [])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-hf-ink">Importações</h1>
        <p className="mt-1 max-w-2xl text-sm text-hf-muted">
          Baixe o molde CSV (UTF-8, separador ;), revise a prévia e aplique. Célula vazia não deve
          apagar dado válido já cadastrado. Publish é explícito no produto — import deixa draft.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {cards.map((c) => (
          <article
            key={c.to}
            className="flex flex-col gap-3 rounded-[14px] border border-hf-line bg-hf-surface p-4"
          >
            <div>
              <h2 className="m-0 text-lg font-extrabold text-hf-ink">{c.title}</h2>
              <p className="mt-1 text-sm text-hf-muted">{c.desc}</p>
            </div>
            <div className="mt-auto flex flex-wrap gap-2">
              <Link to={c.to}>
                <Button type="button">Abrir</Button>
              </Link>
              {c.molde ? (
                <a href={c.molde} download>
                  <Button type="button" variant="light">
                    Baixar molde
                  </Button>
                </a>
              ) : null}
            </div>
          </article>
        ))}
      </div>

      <section className="rounded-[14px] border border-hf-line bg-hf-surface p-4">
        <h2 className="m-0 text-lg font-extrabold text-hf-ink">Histórico recente</h2>
        <p className="mt-1 text-sm text-hf-muted">Últimas 30 importações registradas na tabela imports.</p>
        {historyError ? <p className="mt-2 text-sm text-hf-red">{historyError}</p> : null}
        {!historyError && history.length === 0 ? (
          <p className="mt-2 text-sm text-hf-muted">Nenhuma importação registrada ainda.</p>
        ) : null}
        {history.length > 0 ? (
          <div className="mt-3 overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="text-hf-muted">
                <tr>
                  <th className="border-b border-hf-line px-2 py-2">Data</th>
                  <th className="border-b border-hf-line px-2 py-2">Tipo</th>
                  <th className="border-b border-hf-line px-2 py-2">Arquivo</th>
                  <th className="border-b border-hf-line px-2 py-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {history.map((row) => (
                  <tr key={row.id} className="border-b border-hf-line/50">
                    <td className="px-2 py-2 text-hf-ink">
                      {new Date(row.created_at).toLocaleString('pt-BR')}
                    </td>
                    <td className="px-2 py-2 text-hf-muted">{row.kind ?? '—'}</td>
                    <td className="px-2 py-2 text-hf-muted">
                      {row.file_name || row.filename || '—'}
                    </td>
                    <td className="px-2 py-2 font-semibold text-hf-ink">{row.status ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </section>
    </div>
  )
}
