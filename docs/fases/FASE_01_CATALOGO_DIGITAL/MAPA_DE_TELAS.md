# Mapa de telas — Andar 1 Catálogo Digital

**Versão:** 1.2  
**Data:** 2026-11-26  
**PRD:** [PRD_FASE_01.md](./PRD_FASE_01.md)  
**Jornada:** [HF_JORNADA_COMERCIAL_PLANO.md](./HF_JORNADA_COMERCIAL_PLANO.md) · [specs/](./specs/)  
**Hierarquia admin:** [HF_AUDITORIA_ADMIN_HIERARQUIA.md](./HF_AUDITORIA_ADMIN_HIERARQUIA.md) · [HF_PADRAO_TELAS_UX_OPERACIONAL.md](../../entrada/HF_PADRAO_TELAS_UX_OPERACIONAL.md)

---

## 1. Públicas / loja

| Rota | Página | No escopo Andar 1 | Notas |
|------|--------|-------------------|-------|
| `/` | HomePage | Sim | Hero HF; sem preço |
| `/catalogo` | CatalogPage | Sim | B2bCatalogRoute; D1 |
| `/busca` | CatalogPage | Sim | Alias busca |
| `/categoria/:slug` | CategoryPage | Sim | |
| `/categorias` | CategoriesIndexPage | Sim | |
| `/marca/:slug` | BrandPage | Sim | |
| `/marcas` | BrandsIndexPage | Sim | |
| `/produto/:id` | ProductPage | Sim | WA CTA; sem comprar |
| `/veiculo` | VehiclePage | Sim | Sem placa obrigatória |
| `/sobre` | SobrePage | Sim | Alinhar site |
| `/atendimento` | AtendimentoPage | Sim | WA + contatos |
| `/cotacao` | CotacaoPage | Sim | Cesta multi-item; ver jornada / cotação |
| `/cadastro-comercial` | *(alvo)* / SejaParceiro | Sim | Interesse → lead partner |
| `/seja-parceiro` | SejaParceiroPage | Sim | Alias → cadastro-comercial |
| `/login` | LoginPage | Sim | |
| `/cadastro` | RegisterPage | Sim | Auth (≠ interesse comercial) |
| `/recuperar-senha` | ForgotPasswordPage | Sim | |
| `/conta` | AccountHomePage | Sim | Auth |
| `/conta/perfil` | AccountProfilePage | Sim | |
| `/conta/veiculos` | AccountVehiclesPage | Sim | |
| `/conta/avisos` | AccountAvisosPage | Sim | In-app |
| `/carrinho` `/checkout` `/pedido/*` | — | **Não** | Andar 2 |

---

## 2. Admin (`/admin/*` + StaffRoute)

| Rota relativa | Página | Escopo / nav |
|---------------|--------|--------------|
| `` (dashboard) | AdminDashboardPage | Sim |
| `produtos` | AdminProductsPage | Catálogo (itens) |
| `produtos/marcas` | AdminBrandsPage | Nested; **sem** item sidebar |
| `produtos/novo` `:id` | AdminProductFormPage | Ficha |
| `produtos/importacoes` | AdminImportsHubPage | Hub único |
| `produtos/importar` | AdminProductImportPage | Deep via hub |
| `produtos/importar-aplicacoes` | AdminApplicationsImportPage | Deep via hub |
| `produtos/importar-hf` | AdminHfBundleImportPage | Deep via hub |
| `produtos/importar-imagens` | AdminImageSkuImportPage | Deep via hub |
| `kits` (+ `novo` `:id`) | AdminKits* | Catálogo |
| `categorias` | AdminCategoriesPage | Catálogo |
| `veiculos` | AdminVehiclesPage | Catálogo; entrada Montadoras |
| `montadoras` | AdminManufacturersPage | Deep-link; **sem** sidebar |
| `fabricantes` | → redirect `produtos/marcas` | Compat |
| `aplicacoes` | → redirect `produtos` | Aplicações só na ficha do produto |
| `fornecedores` (+ imports) | AdminSuppliers* | Cadastro; imports via hub |
| `precos` (+ `:id`) | AdminPriceLists* | Catálogo staff (Adaptive) |
| `clientes` | AdminCustomersPage | B2B Adaptive; Comercial = lista + condições (+ vendedor no plano jornada) |
| `clientes/listas` | AdminCatalogsPage | Catálogos de visibilidade; **sem** sidebar |
| `listas` | → redirect `clientes/listas` | Compat |
| `grupos` | AdminCustomerGroupsPage | Clientes |
| `financeiro` | AdminFinanceiro* | Central Finanças |
| `financeiro/condicoes` | AdminPaymentConditionsPage | Condições (agenda + meios) |
| `comunicacao` | AdminComunicacaoPage | Central Comunicação (in-app) |
| `pedidos` | AdminPedidos* | Central Pedidos · Visão |
| `pedidos/cotacoes` | AdminPedidosCotacoesPage | Cotações Adaptive |
| `pedidos/solicitacoes` | *(planejado)* | Solicitações Adaptive — ver jornada |
| `cotacoes` | → redirect `pedidos/cotacoes` | Compat |
| `leads` | AdminLeadsPage | Inbox técnico legado (partner/contact/quote) |
| `campanhas` | AdminCampaignsPage | Comercial |
| `vendedores` | *(planejado)* | Cadastro vendedores Adaptive — ver jornada |
| `operadores` | AdminOperatorsPage | Sistema (staff ≠ vendedor) |

| Morto / limpar | Ação |
|----------------|------|
| AdminPlaceholderPage | Remover (P2) |
| favoriteService (sem tela) | Remover serviço |

---

## 3. Guards

| Guard | Função Andar 1 |
|-------|----------------|
| `B2bCatalogRoute` | Catálogo; login só se flag D1 exigir |
| `ProtectedRoute` | Conta |
| `StaffRoute` | Admin |

---

## 4. Shell público (referência)

```text
[LOGO] [Busca] [Empresa | Conta]
Catálogo · Categorias · Marcas · Aplicações/Veículo · Atendimento
```
