# HF Andar 1 — Mapa de telas

**Diagnóstico:** [HF_ANDAR_1_DIAGNOSTICO.md](./HF_ANDAR_1_DIAGNOSTICO.md)

## Públicas

| Rota | Página | Etapa |
|------|--------|-------|
| `/` | Home | E2 |
| `/catalogo`, `/busca` | Catálogo | E5 |
| `/categorias`, `/categoria/:slug` | Categorias | Gate |
| `/marcas`, `/marca/:slug` | Marcas | Gate |
| `/produto/:id` | PDP | E5/E7 |
| `/veiculo` | Busca por veículo | E5 |
| `/sobre` | Institucional | E2 |
| `/atendimento` | Contato | E2 |
| `/privacidade` | Privacidade | E2 |
| `/cotacao` | Solicitar cotação | E7 |
| `/seja-parceiro` | Parceiro | E7 |
| `/login`, `/cadastro`, `/recuperar-senha` | Auth | Gate |
| `/conta/*` | Conta + veículos | Gate |

## Admin (separadas)

| Rota | Função | Etapa |
|------|--------|-------|
| `/admin` | Dashboard | E8 |
| `/admin/produtos` | Lista produtos | E3 |
| `/admin/produtos/novo`, `/:id` | Form 8 grupos | E3 |
| `/admin/aplicacoes` | Hub aplicações | E4 |
| `/admin/precos`, `/precos/:id` | Listas de preços | Gate |
| `/admin/campanhas` | Campanhas | E6 |
| `/admin/cotacoes` | Cotações | E7 |
| `/admin/leads` | Leads (+ parceiros filtro) | E7 |
| `/admin/produtos/importacoes` | Hub import | E8 |
| `/admin/categorias` | Categorias | Gate |
| `/admin/fabricantes` | Marcas | Gate |
| `/admin/montadoras` | Montadoras | Gate |
| `/admin/veiculos` | Veículos/modelos | E4 |
| `/admin/fornecedores` | Fornecedores | Gate |
| `/admin/listas`, `/clientes`, `/grupos`, `/operadores` | B2B/ops | Gate |
