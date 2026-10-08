import { Button } from '@/components/common/Button'
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
    desc: 'Compatibilidade veículo × produto. SKU precisa existir.',
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

export function AdminImportsHubPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-hf-ink">Importações</h1>
        <p className="mt-1 max-w-2xl text-sm text-hf-muted">
          Baixe o molde CSV (UTF-8, separador ;), revise a prévia e aplique. Categorias e montadoras
          precisam existir no cadastro — a importação não cria árvore sozinha nem publica produtos.
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
              <a href={c.molde} download>
                <Button type="button" variant="light">
                  Baixar molde
                </Button>
              </a>
            </div>
          </article>
        ))}
      </div>
    </div>
  )
}
