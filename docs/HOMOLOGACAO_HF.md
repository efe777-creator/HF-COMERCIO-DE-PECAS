# Homologação HF — gate final (Etapa 10)

Checklist do plano oficial FAL → HF. Evolução B2B (PRD 1.0) substitui “catálogo anônimo” por **catálogo autenticado sem preço público**.

## Infra

- [x] GitHub HF (`efe777-creator/HF-COMERCIO-DE-PECAS`)
- [x] Supabase HF `owllmfcpbodqmoerdfxx` (sa-east-1) — sem URL/keys FAL
- [x] Auth + `profiles` / roles staff
- [x] RLS (`migrations_hf/04_rls.sql`) + `customer_can_see_product`
- [x] Storage `product-images` (+ logos/imports)
- [x] Fonte SQL: `supabase/migrations_hf/` — pasta `migrations/` marcada LEGADO

## Catálogo + admin

- [x] Produtos / categorias / marcas / aplicações / imagens
- [x] Cadastro manual referência: SKU `HF-DEMO-001` (published + aplicação VW Gol)
- [x] Admin: produtos, taxonomia, veículos, fornecedores, importações, operadores, B2B
- [x] Import CSV/XLSX + RPCs `apply_*` + moldes + regras draft

## Experiência

- [x] Busca `search_products` (B2B)
- [x] Gate login catálogo (`features.customer_*`)
- [x] WhatsApp só via `VITE_WHATSAPP_NUMBER`
- [x] Feature flags comerciais **off** (preço/carrinho/checkout/pagamento/frete/estoque/placa)

## Ausente no runtime

- [x] Pedidos / checkout / MP / frete / estoque físico / preço na vitrine
- [x] Removidos: `OrdersPage`, serviços order/address, tipos cart/payment órfãos

## Verificação

- `npm test` + `npm run build`
- Produto demo e RPCs confirmados no projeto HF

**Status:** HF pronta para cadastro real (operação B2B). Staff seed operacional: ver `STAFF_BOOTSTRAP.md`.
