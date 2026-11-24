# fonte — Telas e tabelas (inventário profundo para HF)

**Data:** 2026-11-23  
**Status:** CANÔNICO (evidência)  
**Restrição:** projeto de terceiros = **somente leitura**  
**Fontes:** `fonte-pecas/src/app/router.tsx`, `FAL_DADOS_FONTES_VERDADE.md`, `DATABASE.md`, consolidada PRD4  
**Contraste HF:** `docs/auditoria/runtime/*`

---

## 1. Telas loja fonte de referência

| Rota | Função | Tabelas / contratos | Na HF? |
|------|--------|---------------------|--------|
| `/` | Home | home content, products | Sim (adaptado) |
| `/catalogo` | Catálogo | `search_products` | Sim |
| `/busca` | Redirect catálogo | — | Sim (`/busca`) |
| `/produto/:slugOrId` | PDP + preço/estoque | products, resolve price, inventory | HF sem preço/estoque vitrine |
| `/veiculo` | Seletor + placa | VV, placa edge | HF sem placa |
| `/garagem` | → conta veículos | customer_vehicles | HF parcial |
| `/carrinho` | Carrinho | carts | **Não** |
| `/checkout` | Checkout | place_order, frete, pay | **Não** |
| `/pedido/:id/confirmacao` | Confirmação | orders | **Não** |
| `/conta/*` | Perfil, endereços, veículos, favoritos, pedidos, avisos | customers, addresses, favorites, orders, notif | HF: perfil + veículos |
| `/login` `/cadastro` `/recuperar-senha` `/redefinir-senha` | Auth | profiles | Sim (sem redefinir dedicado?) |
| `/suporte` + páginas legais | Legal / frete / garantia | — | HF: atendimento/sobre |
| `/dev/mp-brick` | Dev pay | — | **Não** |

---

## 2. Telas admin fonte (por domínio)

### Catálogo / import / preço

| Rota | Função | HF equivalente |
|------|--------|----------------|
| `/admin` | Dashboard | Sim |
| `produtos`, `novo`, `:id` | CRUD | Sim |
| `aplicacoes` | Apps dedicada | HF via produto + import apps |
| `produtos/importar*` | Imports (+ imagens, kits) | HF: produtos/apps/hf (sem imagens/kits dedicados) |
| `kits*` | Kits | **Não** |
| `precos`, `precos/:id` | Listas | Sim (PREP) |
| `importacoes` | Hub | Sim (`produtos/importacoes`) |
| `categorias` | Categorias | Sim |
| `home`, `home/promocoes*` | Merchandising | **Não** admin |
| `busca` | Search prep | **Não** (e fora sidebar fonte) |
| `montadoras`, `veiculos`, `veiculos/integracoes`, `importar-mestre` | Mestre veículo | HF: montadoras/veiculos (sem integrações/mestre import) |
| `modelos-3d`, `imagens-stock` | 3D / stock images | **Não** |
| `fabricantes`, `fornecedores`, imports conversão/custo | Supply | Sim |

### Pedidos / clientes / estoque

| Rota | Função | HF |
|------|--------|-----|
| `pedidos` hub, lista, visões, `:id` | Lifecycle pedidos | **Não** (Sidicom) |
| redirects áreas legadas | Análise/separação/expedição | — |
| `clientes` | Customers B2C | HF B2B `clientes`/`grupos`/`listas` |
| `estoque` | Inventory | **Não** (Sidicom) |

### Logística / pagamentos / ops

| Rota | Função | HF |
|------|--------|-----|
| `logistica/*` (origem, frete próprio, ME, caixas, prazos, config) | Frete | **Não** — futuro Andar 6 frete grátis |
| `pagamentos/*` | MP/Asaas | **Não** |
| `relatorios` | BI | **Não** |
| `avisos` | Notificações | **Não** |
| `operadores` | Staff | Sim |

---

## 3. Tabelas fonte por domínio (SoT)

| Domínio | Tabelas / RPC | SoT fonte | HF migrations_hf | Sidicom |
|---------|---------------|---------|------------------|---------|
| Produto | products, categories, brands, images, refs | products | Sim | Paralelo possível |
| Fitment | product_vehicle_compatibility | PVC | Sim | — |
| Veículo mestre | manufacturers, models, vehicle_versions | mestre | Sim | — |
| INV | aliases, cached_plates, events | aditivo | Não | — |
| Garagem | customer_vehicles | seed | **Código HF sem SQL** | — |
| Preço | price_lists*, resolve_product_price | RPC | PREP | Comercial |
| Estoque | inventory, movements, store_settings | inventory | Não | **SoT** |
| Carrinho | carts, cart_items | carts | Não | — |
| Pedido | orders, order_items, place_order | orders | Não | **SoT** |
| Pagamento | payments, routing_config, edges | payments | Não | Sidicom |
| Frete | shipping_quotes, shipments, boxes, own | quotes | Não | Ops + apps |
| Import | imports, import_items, profiles | imports | Sim | — |
| Supply | suppliers, supplier_products | supply | Sim | — |
| Notif | app_notifications | notif | Não | — |
| B2B HF | — | — | customers/groups/catalogs | Cadastro Sidicom |

---

## 4. Edge functions fonte × necessidade HF

| Edge | Domínio | Portar HF? |
|------|---------|------------|
| search NL | busca | Opcional Andar 1/8 |
| plate / vehicle-* | veículo | Opcional |
| quote-shipping / ME / own | frete | Adaptar Andar 6 (custo interno; não cobrar cliente) |
| create-*-payment / webhooks / sync | pay | Não curto prazo |
| OTP WA | auth | Opcional |

---

## 5. Como usar com o mestre de aproveitamento

Para cada tela/tabela fonte de referência acima: abrir `HF_REF_APROVEITAMENTO_DETALHADO.md` e aplicar a **Ação** da capacidade correspondente. Este arquivo é o inventário fino; o mestre é a **decisão**.
