# MAPA FAL → HF

**GATE 01 — Auditoria concluída**  
Base de referência (somente leitura): `FAL PECAS AUTOMOTIVAS/fal-pecas`  
Cópia de trabalho: `HF COMERCIO DE PECAS/hf-comercio-de-pecas`

## Checklist GATE 01

| Critério | Status |
|----------|--------|
| Nenhuma secret FAL reutilizada | OK — `.env.local` aponta para Supabase HF (`owllmfcpbodqmoerdfxx`) |
| Nenhuma URL Supabase FAL | OK |
| Pagamento não necessário no MVP | OK — Mercado Pago removido do runtime |
| Migrations inventariadas | OK — ver tabela abaixo / `ARQUITETURA_HF.md` |
| Dependências a remover listadas | OK — `@mercadopago/sdk-react` removido |
| Módulos preservar vs remover | OK — tabela deste documento |

## Tabela módulo → ação

| Módulo FAL | HF | Ação |
|------------|----|------|
| Produtos | Sim | Reaproveitar/adaptar |
| Categorias | Sim | Reaproveitar/adaptar |
| Marcas (`product_brands`) | Sim | Reaproveitar/adaptar |
| Aplicações / veículos | Sim | Reaproveitar/adaptar |
| Busca (`search_products`) | Sim | Reaproveitar/adaptar |
| Importação CSV/XLSX | Sim | Adaptar |
| Auth + staff | Sim | Adaptar |
| RLS | Sim | Reescrever/auditar |
| Storage `product-images` | Sim | Reaproveitar |
| Fornecedores / códigos | Sim | Adaptar (sem compras) |
| Pedidos | Não MVP | Removido do runtime |
| Checkout | Não MVP | Removido |
| Mercado Pago | Não MVP | Removido |
| Frete | Não MVP | Removido |
| Estoque físico | Não MVP | Não ativar |
| Preço público | Não MVP | Não ativar (helpers internos mantidos) |
| Carrinho | Não MVP | Removido |

## Classes A–E (resumo)

- **A CORE:** Auth, RLS, services layer, import pipeline, search RPC, admin CRUD catálogo  
- **B FAL:** branding `--fal-*`, logos, copy, seeds comerciais, MP, `FAL-SUP-01`  
- **C Adaptar:** Home/PDP/busca/veículo, admin nav, WhatsApp, fornecedores  
- **D Futuro (só se isolável):** preço avançado, estoque, pedidos — **não** permanecer no bundle se acoplar deps  
- **E Criar:** `src/config/features.ts`, `business.ts`, docs HF, identidade visual HF, projeto Supabase HF  

## Dependências npm

| Pacote | MVP |
|--------|-----|
| `@mercadopago/sdk-react` | **Removido** |
| `@supabase/supabase-js`, `react`, `react-router-dom`, `xlsx`, Vite, Tailwind, Vitest | Manter |

## Paths removidos do runtime HF

- `src/pages/Cart`, `Checkout`, `admin/orders|shipping|inventory|reports|prices|customers`
- `src/components/payments`, `CartButton`
- `src/contexts/CartContext`, `src/services/cart|orders|payments|shipping`
- Edge Functions MP (`create-mp-payment`, `mercado-pago-webhook`)

## Env HF MVP

```
VITE_SUPABASE_URL
VITE_SUPABASE_ANON_KEY
VITE_WHATSAPP_NUMBER
```
