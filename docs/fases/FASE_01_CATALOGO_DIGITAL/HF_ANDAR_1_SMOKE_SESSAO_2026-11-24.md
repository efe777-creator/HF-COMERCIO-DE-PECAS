# Sessão smoke completa Andar 1 — 2026-11-24

Ciclo: **Validação → Ajuste → Teste → Validação → Smoke → Validação final**

## 1. Validação automática

| Check | Resultado |
|-------|-----------|
| `npm test` | **78/78 PASS** |
| `npm run build` | **PASS** |
| Tokens tokens de terceiros em `src/` | **0 ocorrências** |
| Schema Supabase (PVC cols, models years, campaigns, leads, kits, product_kind/is_featured) | **PASS** (4+3+1+1+1+2) |
| Massa | 49 published · 384 PVC |
| RPC `search_products(..., year=2012)` | **36** produtos |
| Insert lead smoke | **PASS** (`Smoke Test Andar1`) |

## 2. Ajustes nesta sessão

Nenhum P0/P1 encontrado no código local.  
**P2 ops:** produção (`hfcomerciodepecas.com`) ainda sem deploy das rotas novas (`/privacidade`, `/cotacao`, `/seja-parceiro`) — redirecionam para home. Local Vite **OK**.

## 3. Smoke local (`http://127.0.0.1:5173`)

| ID | Caso | Resultado |
|----|------|-----------|
| L01 | Home CTAs catálogo/veículo/cotação/parceiro · sem preço | **PASS** |
| L02 | `/privacidade` | **PASS** |
| L03 | `/cotacao` formulário | **PASS** |
| L04 | `/seja-parceiro` formulário + tipos negócio | **PASS** |
| L05 | `/catalogo?year=2012` → 36 produtos · sem `R$` | **PASS** |
| L06 | `/admin` dashboard 49/384/leads=1/campanhas=0 | **PASS** |
| L07 | `/admin/aplicacoes` lista PVC com anos (ex. 19/21) | **PASS** |
| L08 | `/admin/campanhas` form CRUD | **PASS** |
| L09 | `/admin/leads` mostra lead smoke | **PASS** |
| L10 | Menu admin separado Produtos · Aplicações · Preços · Comercial | **PASS** |

## 4. Smoke produção (`https://hfcomerciodepecas.com`)

| ID | Caso | Resultado |
|----|------|-----------|
| P01 | Home / catálogo / busca pivo / veículo / sobre / atendimento | **PASS** |
| P02 | PDP sem preço / sem comprar · WA | **PASS** |
| P03 | `/privacidade` `/cotacao` `/seja-parceiro` | **FAIL deploy** (código local pronto) |

## 5. Validação final

| Critério | Status |
|----------|--------|
| Zero P0/P1 no runtime local + DB | **SIM** |
| Testes + build | **SIM** |
| Smoke Andar 1 local completo | **SIM** |
| Smoke Gate produção (D1) | **SIM** |
| Deploy Hostinger build novo | **PENDENTE** |
| Assinatura dono Homologação | **PENDENTE** |

**Veredito técnico:** Andar 1 **validado** em ambiente local + Supabase. Liberar deploy para fechar gap de produção nas 3 rotas novas.
