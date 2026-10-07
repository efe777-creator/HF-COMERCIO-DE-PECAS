/** Dados de demonstração — NÃO são o catálogo real da FAL. */
export const MOCK_DISCLAIMER =
  'DEMO / MOCK — dados fictícios apenas para fundação visual. Não representam o catálogo real da FAL.'

export const mockCategories = [
  {
    id: 'cat-suspensao',
    name: 'Suspensão',
    slug: 'suspensao',
    description: 'Pivôs, bandejas, bieletas e buchas',
    emoji: '🔧',
  },
  {
    id: 'cat-direcao',
    name: 'Direção',
    slug: 'direcao',
    description: 'Terminais, axiais e componentes',
    emoji: '⚙️',
  },
  {
    id: 'cat-fluidos',
    name: 'Óleos e Fluidos',
    slug: 'oleos-e-fluidos',
    description: 'Produtos de manutenção e consumo',
    emoji: '🛢️',
  },
  {
    id: 'cat-outros',
    name: 'Outros Produtos',
    slug: 'outros-produtos',
    description: 'Estrutura preparada para expansão',
    emoji: '🚘',
  },
] as const

export const mockNavCategories = [
  { label: 'Suspensão', href: '/catalogo?cat=Suspensão' },
  { label: 'Direção', href: '/catalogo?cat=Direção' },
  { label: 'Lubrificantes e Fluidos', href: '/catalogo?cat=Lubrificantes%20e%20Fluidos' },
  { label: 'Outras Categorias', href: '/catalogo?cat=Outros%20Produtos' },
] as const
