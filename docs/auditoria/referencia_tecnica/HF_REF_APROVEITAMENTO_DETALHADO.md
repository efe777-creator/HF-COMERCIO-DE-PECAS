# HF — referência técnica — Guia de aproveitamento (para montar o PRD)

**Versão:** 2.1  
**Data:** 2026-11-23  
**Status:** CANÔNICO  
**PRD-Mestre (prédio):** [HF_PRD_MESTRE_2036.md](../../entrada/HF_PRD_MESTRE_2036.md) **v1.0**  
**Restrição absoluta:** **não alterar** a projeto de terceiros. Tudo se implementa só no repo HF.

---

## Para que serve este documento

Este é o **mapa de decisão** entre:

1. o que a **fonte** já fez (referência de método e código),  
2. o que a **HF** já tem hoje no app,  
3. o que a HF **precisa construir** (Sidicom, frete grátis, 99/Uber, agentes de IA),  
4. em **qual andar** cada coisa entra no PRD.

Use-o assim:

| Momento | O que fazer aqui |
|---------|------------------|
| Antes de escrever o PRD do andar | Ler a seção do andar + checklist |
| Antes de copiar qualquer coisa da fonte de referência | Conferir a coluna **Ação** da capacidade |
| Em dúvida “trazemos ou não?” | Seguir a regra de ouro (§18) |
| Detalhe de tela/tabela/RPC | Ir aos satélites (§1) — este doc não substitui a auditoria fina |

**Não é** o PRD em si. O PRD-Mestre descreve o **prédio**; o PRD de cada fase descreve o **andar**. Este guia diz **o que aproveitar, adaptar ou inventar** em cada um.

---

## 1. Em uma página — o que a HF está construindo

```text
HOJE                          FUTURO (CORE)
─────                         ─────────────
Sidicom = ERP oficial         HF CORE = substitui Sidicom
(pedido, estoque, fiscal)     aos poucos, andar a andar

HF app = vitrine + admin      + pedidos digitais
         catálogo/fitment     + estoque sincronizado
         WA humano            + frete grátis (custo interno)
                              + 99 Entrega / Uber Direct
                              + agentes IA (pedido/estoque)
```

| Decisão de negócio (já travada) | Significado prático |
|--------------------------------|---------------------|
| HF ≠ cópia da fonte de referência | Mesma *lógica operacional* quando fizer sentido; **identidade, B2B e regras** são HF |
| Frete grátis ao cliente | Cliente não paga frete; 99/Uber/frota viram **custo interno** |
| Sidicom SoT hoje | Pedido/estoque oficiais ainda nascem no Sidicom até o CORE assumir |
| IA e apps de entrega | Preparar contratos cedo; **ligar só no andar certo** |
| Onda de 10 andares | Um PRD por vez: Mestre → Fase 1 → Gate → Fase 2… |

---

## 2. Glossário rápido (como ler a matriz)

### Ações

| Ação | Em português | O que fazer no PRD / código |
|------|--------------|-----------------------------|
| **REUSAR** | Já serve | Portar/manter com branding e projeto HF |
| **ADAPTAR** | Serve a ideia, não o pacote | Mudar schema, UI, flags, regras B2B/Sidicom |
| **REFERENCIA_SO_METODO** | Só o método | Copiar processo/UX de trabalho; **nunca** visual/tokens de terceiros |
| **NAO_TRAZER** | Não entra | Não colar código nem regra fonte de referência |
| **CONSTRUIR_HF** | Só HF precisa | Inventar no PRD do andar (não existe útil na fonte de referência) |
| **CORRIGIR_HF** | Bug/drift no app HF | Consertar **antes** de expandir o módulo |

### Status

| Status | Significado |
|--------|-------------|
| DONE | Existe e funciona |
| PARTIAL | Existe incompleto |
| PREP | Schema/admin existe; loja ainda não liga |
| MISSING | Não existe no HF |
| BROKEN | UI/código chama algo que **não tem** no schema |
| ORPHAN | Código morto / sem tabela |

### Andares (resumo)

| Andar | Nome curto | Em uma frase |
|-------|------------|--------------|
| F | Fundação | Auth, RLS, flags, deploy, SoT |
| 1 | Catálogo | Produto, veículo, busca, admin, WA |
| 2 | Comercial | Pedido digital + sync Sidicom |
| 3 | Estoque | Saldo, compras, sync Sidicom |
| 4 | Fiscal | NF, financeiro |
| 5 | Portal B2B | Área do cliente |
| 6 | Logística | Separação + **99/Uber** + frete grátis |
| 7 | Marketing | Campanhas |
| 8 | IA | Agentes com tools + humano no loop |
| 9 | BI | Indicadores |
| 10 | Expansão | Novos canais |

Detalhe oficial: [HF_PRD_MESTRE_2036.md](../../entrada/HF_PRD_MESTRE_2036.md).

---

## 3. Documentos satélite (evidência fina)

| Precisa de… | Abrir |
|-------------|--------|
| Rotas/telas fonte vs HF | [HF_REF_TELAS_TABELAS_PROFUNDAS.md](./HF_REF_TELAS_TABELAS_PROFUNDAS.md) |
| Todas as telas HF | [HF_AUDITORIA_TELAS_FUNCOES.md](../runtime/HF_AUDITORIA_TELAS_FUNCOES.md) |
| Tabelas/RPCs/drifts | [HF_AUDITORIA_TABELAS_RPCS.md](../runtime/HF_AUDITORIA_TABELAS_RPCS.md) |
| Tela × serviço × tabela | [HF_AUDITORIA_RUNTIME_PROFUNDA.md](../runtime/HF_AUDITORIA_RUNTIME_PROFUNDA.md) |
| IA + 99 + Uber + Sidicom | [HF_INTEGRACOES_E_AGENTES_PREP.md](../../arquitetura/HF_INTEGRACOES_E_AGENTES_PREP.md) |
| UX operacional (sem visual de terceiros) | [HF_PADRAO_TELAS_UX_OPERACIONAL.md](../../entrada/HF_PADRAO_TELAS_UX_OPERACIONAL.md) |
| Prédio completo | [HF_PRD_MESTRE_2036.md](../../entrada/HF_PRD_MESTRE_2036.md) |
| PRD do Andar 1 | [PRD_FASE_01.md](../../fases/FASE_01_CATALOGO_DIGITAL/PRD_FASE_01.md) |
| Sidicom | [HF_SIDICOM_E_TRANSICAO.md](../../operacao/HF_SIDICOM_E_TRANSICAO.md) |
| Frete grátis | [HF_LOGISTICA_FRETE_GRATIS.md](../../operacao/HF_LOGISTICA_FRETE_GRATIS.md) |

---

## 4. Consertar primeiro (P0/P1) — antes de portar mais coisa

Estes itens **bloqueiam qualidade** do Andar 1. Tratar no PRD Fase 1 / Gate 01.

| Prioridade | Problema | Ação | Como validar |
|------------|----------|------|--------------|
| **P0** | `/conta/veiculos` usa tabela `customer_vehicles` que **não está** em `migrations_hf` | **CORRIGIR_HF** | Criar migration + RLS **ou** desligar a rota |
| P1 | `favoriteService` sem tabela `favorites` | **CORRIGIR_HF** | Remover serviço |
| P1 | `adminCustomerService` fala em `orders` (HF não tem) | **CORRIGIR_HF** | Remover ou isolar |
| P1 | `AddressForm` / address sem rota | **CORRIGIR_HF** | Remover ou guardar para Andar 2 |
| P1 | **D1:** catálogo público (flag false + migration 08) vs docs “B2B autenticado” | Decisão de produto | Registrar na Visão / PRD Fase 1 |
| P2 | `AdminPlaceholderPage` morto; overlap de migrations | **CORRIGIR_HF** | Limpar + runbook DB limpo |

**Checklist P0 garagem**

- [ ] `CREATE TABLE customer_vehicles` (+ RLS) alinhada ao `customerVehicleService`  
- [ ] **Ou** feature-flag / remover rota até existir schema  
- [ ] Não trazer “Garage rica / 3D” da fonte de referência  

---

## 5. O que entra no PRD — por andar (visão para análise)

Leitura recomendada para montar PRDs: comece por esta seção; use as matrizes (§7+) só para detalhe.

### Fundação (F) — já em curso

| Capacidade | Ação | Nota para o PRD |
|------------|------|-----------------|
| Auth, profiles, roles, guards | REUSAR / ADAPTAR | Projeto Supabase HF; roles HF |
| RLS (incl. published anon) | REUSAR | Entender migration 08 |
| Operadores admin | REUSAR | — |
| Flags, SoT, secrets | CONSTRUIR_HF | Nunca secrets no front |
| Estudo Sidicom (D5) | CONSTRUIR_HF | Questionário ao fornecedor |

### Andar 1 — Catálogo Digital ← **PRD atual**

| Capacidade | Ação | Trazer da fonte de referência? | O que o PRD deve exigir |
|------------|------|----------------|-------------------------|
| CRUD produtos, categorias, marcas, imagens, OEM | REUSAR | Sim (com branding HF) | Publish, SKU HF, escopo L1 |
| Busca + PDP | REUSAR / ADAPTAR | Sim, sem carrinho | Sem preço se flag off; CTA WhatsApp |
| Veículos / PVC / seletor | REUSAR | Sim | Fitment confiável |
| Import CSV/XLSX + apply | REUSAR | Sim | Draft default; moldes HF |
| Placa (lookup) | ADAPTAR | Só depois, com flag | Manual basta na Fase 1 |
| Garagem conta | CORRIGIR_HF | Não copiar rica | Consertar P0 |
| Kits | ADAPTAR / adiar | Só se HF vender kit | Decisão negócio |
| CTA WhatsApp | REUSAR | Número só via env | Canal oficial de pedido **na Fase 1** |
| Prep IA (IDs/SKU estáveis) | CONSTRUIR_HF (prep) | — | Catálogo estável = insumo futuro do agente |

**Fora do Andar 1:** carrinho, checkout, estoque live, pagamento, 99/Uber, agentes em produção.

### Andar 2 — Comercial

| Capacidade | Ação | Dependência |
|------------|------|-------------|
| Carrinho / checkout / place_order | ADAPTAR | D5 Sidicom iniciado; frete cliente = 0 |
| Hub pedidos admin | ADAPTAR | Espelho + anti-duplicidade Sidicom |
| Prep tools IA `draft_order` / `confirm_order` | CONSTRUIR_HF (prep) | Contrato no PRD; agente só no Andar 8 |
| Clientes B2B sync Sidicom | CONSTRUIR_HF | Sidicom = SoT cadastro até corte |

### Andar 3 — Estoque

| Capacidade | Ação | Dependência |
|------------|------|-------------|
| Inventário / movimentos | ADAPTAR | Sidicom SoT; um writer só |
| Prep tool `get_stock` | CONSTRUIR_HF (prep) | Agente estoque no Andar 8 |

### Andar 4 — Fiscal / pagamentos

| Capacidade | Ação | Nota |
|------------|------|------|
| MP/Asaas da fonte de referência | **NAO_TRAZER** (curto prazo) | Reavaliar só se CORE cobrar |
| NF / títulos | CONSTRUIR_HF | Alinhado Sidicom |

### Andar 5 — Portal B2B

| Capacidade | Ação | Nota |
|------------|------|------|
| Grupos / listas / catálogo por cliente | ADAPTAR | Ligar flag só com D1 fechado |
| Cliente confirma pedido sugerido por IA | CONSTRUIR_HF | Depois do Andar 8 |

### Andar 6 — Logística (99 + Uber)

| Capacidade | Ação | Nota para o PRD |
|------------|------|-----------------|
| Melhor Envio cobrado (modelo fonte) | **NAO_TRAZER** | HF não cobra frete do cliente |
| Packing / frota / admin logística | ADAPTAR | Custo interno |
| API **99 Entrega** | CONSTRUIR_HF | OAuth; fee → ledger |
| API **Uber Direct** | CONSTRUIR_HF | Sandbox → piloto → prod |
| Política frete grátis | CONSTRUIR_HF | Ver doc de frete |

### Andar 7 — Marketing

Promoções, avisos — **ADAPTAR** quando houver política HF.

### Andar 8 — Agentes de IA

| Agente | Ação | Precisa ter pronto |
|--------|------|--------------------|
| Comercial (tirar pedidos) | CONSTRUIR_HF | Tools pedido + Sidicom + humano |
| Estoque | CONSTRUIR_HF | `get_stock` |
| Logístico | CONSTRUIR_HF | quote/dispatch 99·Uber |
| WA agentic “cego” da fonte de referência | **NAO_TRAZER** | Desenhar sob HF |

Contratos: [HF_INTEGRACOES_E_AGENTES_PREP.md](../../arquitetura/HF_INTEGRACOES_E_AGENTES_PREP.md).

### Andares 9–10

BI (margem com frete, uso de IA) e expansão — **CONSTRUIR_HF** / **ADAPTAR** conforme dados dos andares anteriores.

---

## 6. Como a onda alimenta o PRD (método)

```text
0. PRD-Mestre = prédio inteiro (visão + andares + gates)
1. Este guia = o que reusar / adaptar / construir em cada andar
2. PRD Fase N = escopo, RF, dados, aceite **só daquele andar**
3. Gate N = “pode começar o PRD N+1?”
4. Preparar N+1 durante homologação de N = OK
5. Implementar N+1 sem Gate = NÃO
```

**Regra de ouro**

1. `NAO_TRAZER` → não cola código.  
2. `ADAPTAR` → checklist + Sidicom / frete / B2B / UX HF.  
3. `CORRIGIR_HF` → drift **antes** de expandir.  
4. `CONSTRUIR_HF` → nasce no PRD do andar; fonte só se a matriz disser.  
5. Agente ou API de entrega **sem Gate do andar** = proibido em produção.  
6. Nunca aplicar as ~210 migrations/edges da fonte de referência “de uma vez” no Supabase HF.

---

## 7. Matriz detalhada — Catálogo / busca / PDP

| Capacidade | Fonte | HF hoje | Ação | Estrutura / adaptação | Validação | Andar | Sidicom |
|------------|-----|---------|------|----------------------|-----------|-------|---------|
| CRUD produtos | admin produtos | admin produtos | **REUSAR** | Branding HF; SKU HF; L1 Suspensão/Direção/Freios | Aceite CRUD + publish | 1 | Cadastro paralelo OK |
| Categorias | product_categories | idem | **REUSAR** | Seed `11_hf_categories_scope` | Árvore L1–Ln | 1 | — |
| Marcas peça | product_brands | idem | **REUSAR** | ≠ montadora ≠ fornecedor | — | 1 | — |
| Imagens | storage | adminImageService | **REUSAR** | Bucket projeto HF | Upload PDP | 1 | — |
| Refs OEM | product_references | idem | **REUSAR** | Tipos ref_type | Import refs | 1 | — |
| Busca | search_products | searchService | **REUSAR** | Sem preço se `price_enabled=false`; RLS 08 | Smoke busca | 1 | — |
| PDP | /produto/:slug | /produto/:id + WA | **ADAPTAR** | Sem comprar; tokens `--hf-*`; sem estoque vitrine | Aceite UX PDP | 1 | — |
| Home | / + promo | HomePage | **ADAPTAR** | Sem admin promo preço até política | — | 1/7 | — |
| Kits | admin kits | — | **ADAPTAR** | Só se HF vender kit | Decisão negócio | 1+ | — |
| Status publish | products.status | idem | **REUSAR** | Import → draft; status ≠ estoque | Regra import | 1 | — |

**Checklist ADAPTAR PDP/Home:** tokens HF · sem carrinho · WA só env · aceite UX B2B.

---

## 8. Matriz — Veículos / aplicações / placa / garagem

| Capacidade | Fonte | HF | Ação | Estrutura / adaptação | Validação | Andar |
|------------|-----|-----|------|----------------------|-----------|-------|
| Mestre VV | montadoras/veículos | admin montadoras/veículos | **REUSAR** | Sem seeds fonte | Cascata /veiculo | 1 |
| PVC | tabela + apps | idem + import | **REUSAR** | year_start/end | Apps no PDP | 1 |
| Seletor /veiculo | + placa | manual | **REUSAR** | Placa só com flag | Sem placa OK Fase 1 | 1 |
| Import apps | RPC | idem | **REUSAR** | Moldes HF | Vitest + apply | 1 |
| Placa | Edge plate-lookup | — | **ADAPTAR** | Edge HF; LGPD; degradação manual | Flag `vehicle_plate_enabled` | 1+ |
| INV / aliases | resolveVehicleIdentity | — | **ADAPTAR** | Não misturar com PVC | Só método | 1/8 |
| Garagem | customer_vehicles | rota + service | **CORRIGIR_HF** → **ADAPTAR** | Criar tabela ou desligar rota | Grep: tabela + RLS | 1/5 |
| Garage 3D | futuro fonte | — | **NAO_TRAZER** | — | — | — |

---

## 9. Matriz — Importação / fornecedores / custos

| Capacidade | Ação | Andar | Sidicom |
|------------|------|-------|---------|
| Pipeline CSV/XLSX | **REUSAR** | 1 | — |
| Apply produtos/apps | **REUSAR** | 1 | — |
| Fornecedores | **REUSAR** | 1/3 | Espelho cadastro TBD |
| Conversão / custo | **REUSAR** | 3 | Custo vs Sidicom |
| Bundle importar-hf | **REUSAR** | 1 | — |
| Import imagens/kits fonte | **ADAPTAR** se necessário | 1+ | — |

---

## 10. Matriz — Auth / B2B / pedidos / preço / estoque

### Auth / staff / RLS

| Capacidade | Ação | Andar |
|------------|------|-------|
| Auth email + redirects | **REUSAR** | F |
| Profiles / roles HF | **ADAPTAR** | F |
| Guards (Staff, Protected, B2b) | **REUSAR** | F |
| RLS 04 + 08 public | **REUSAR** | F |
| OTP WhatsApp | **ADAPTAR** | 5/8 |

### B2B (modelo HF ≠ B2C fonte)

| Capacidade | Ação | Andar | Sidicom |
|------------|------|-------|---------|
| Customer B2C + CPF checkout fonte | **NAO_TRAZER** | — | — |
| Clientes B2B (CNPJ, pending…) | **REUSAR** base + sync | 2/5 | **SoT cadastro** |
| Grupos / listas | **ADAPTAR** loja | 5 | — |
| adminCustomerService + orders | **CORRIGIR_HF** | 2 | SoT pedido |

### Carrinho / pedidos

| Capacidade | Ação | Andar | Sidicom |
|------------|------|-------|---------|
| Cart / checkout / place_order | **ADAPTAR** | 2 | Anti-duplicidade; SoT até corte |
| Hub pedidos admin | **ADAPTAR** | 2/6 | Espelho |
| Favoritos fonte | **NAO_TRAZER** + **CORRIGIR_HF** (orphan) | — | — |

### Preço / estoque

| Capacidade | Ação | Andar | Sidicom |
|------------|------|-------|---------|
| Listas / resolve preço | **ADAPTAR** | 2/5 | Preço oficial TBD |
| Promoções | **ADAPTAR** | 7 | — |
| Inventory | **ADAPTAR** | 3 | **SoT** |
| Modos loja fonte de referência | **ADAPTAR** | 3 | Distribuidora ≠ fictício fonte |

---

## 11. Matriz — Pagamentos / frete / ops / IA

### Pagamentos

| Capacidade | Ação | Andar |
|------------|------|-------|
| MP/Asaas + webhooks fonte | **NAO_TRAZER** curto prazo | 4 (reavaliar) |

### Frete / logística

| Capacidade | Ação | Andar |
|------------|------|-------|
| ME cobrado no checkout | **NAO_TRAZER** | 6 |
| Packing / frete próprio / admin logística | **ADAPTAR** | 6 |
| API 99 Entrega | **CONSTRUIR_HF** | 6 |
| API Uber Direct | **CONSTRUIR_HF** | 6 |
| Política frete grátis + ledger | **CONSTRUIR_HF** | 6 |

### Admin ops

| Capacidade | Ação | Andar |
|------------|------|-------|
| Relatórios | **ADAPTAR** | 9 |
| Operadores | **REUSAR** | F |
| Avisos | **ADAPTAR** | 7/8 |
| AdminPlaceholderPage | **CORRIGIR_HF** | — |
| Layout Adaptive (lista+guia+abas) | **REFERENCIA_SO_METODO** | UX HF |

### WhatsApp / IA

| Capacidade | Ação | Andar |
|------------|------|-------|
| CTA WA | **REUSAR** | 1 |
| OTP | **ADAPTAR** | 5/8 |
| NL search | **ADAPTAR** | 1/8 |
| Agente comercial / estoque / logística | **CONSTRUIR_HF** | 8 (prep 1–6) |
| WA agentic fonte cego | **NAO_TRAZER** | 8 |

---

## 12. RPCs e Edges — mapa de ação

| Item | HF hoje | Ação |
|------|---------|------|
| `search_products` | Sim | **REUSAR** |
| `customer_can_see_product` / `current_customer_ids` | Sim | **REUSAR** (loja gated depois) |
| `apply_*` imports | Sim | **REUSAR** |
| `resolve_product_price(s)` | PREP | **ADAPTAR** |
| `place_order` + transitions | Não | **ADAPTAR** + Sidicom |
| Edges pagamento | Não | **NAO_TRAZER** curto |
| Edges ME / own delivery | Não | **ADAPTAR** Andar 6 |
| plate / vehicle / NL / OTP | Não | **ADAPTAR** sob flag |

---

## 13. Dados — o que já temos vs o que estruturar

### Já no HF (`migrations_hf`) — manter

`profiles`, `manufacturers`, `models`, `vehicle_versions`, `product_categories`, `product_brands`, `suppliers`, `products`, `product_images`, `product_references`, `product_vehicle_compatibility`, `supplier_products`, `imports`, `import_items`, `import_profiles`, `customer_groups`, `customers`, `customer_users`, `catalogs`, `catalog_products`, `customer_group_catalogs`, `customer_catalogs`, `price_lists`, `price_list_items`, `price_change_history` + RPCs do doc de tabelas.

### Precisa estruturar

| Estrutura | Motivo | Andar | Ação |
|-----------|--------|-------|------|
| `customer_vehicles` (+ RLS) | UI já chama | 1 | **CORRIGIR_HF** P0 |
| Pedidos / itens | CORE + Sidicom | 2 | **CONSTRUIR_HF** / **ADAPTAR** |
| Estoque / movimentos | Sync Sidicom | 3 | Sync primeiro |
| Custo frete interno / modalidade | 99/Uber/frota | 6 | **CONSTRUIR_HF** |
| Bridge Sidicom (sync / outbox) | Coexistência | F→2–4 | **CONSTRUIR_HF** |
| favorites, carts, payments MP | Drift fonte | — | **NAO_TRAZER** até decisão |

### Nunca fazer

Aplicar o pacote inteiro de migrations/edges da fonte de referência no Supabase HF. Portar **capacidade a capacidade**.

---

## 14. Identidade e UX (não confundir com “copiar a fonte de referência”)

| Capacidade | Ação | Adaptação |
|------------|------|-----------|
| Tokens/logos fonte | **NAO_TRAZER** | Só `--hf-*` |
| Padrão telas (lista + guia + abas + vocabulário) | **ADAPTAR** comportamento | Doc: `HF_PADRAO_TELAS_UX_OPERACIONAL.md` |
| Locks antiregressão fonte | **REFERENCIA_SO_METODO** | Suite HF-* futura |
| Conteúdo PRD/Visão fonte | **NAO_TRAZER** regras | Visão HF 2036 + Sidicom + frete |

---

## 15. Só HF (sem equivalente fonte útil)

| Necessidade | Andar | Ação |
|-------------|-------|------|
| Bridge / estudo Sidicom (D5) | F→2–4 | **CONSTRUIR_HF** |
| Frete grátis + ledger + 99/Uber | 6 | **CONSTRUIR_HF** |
| Condições/limites B2B no portal | 5 | **CONSTRUIR_HF** |
| Fiscal/NF próprio | 4 | **CONSTRUIR_HF** |
| Expansão multi-CD | 10 | **CONSTRUIR_HF** |
| Agentes IA (pedido, estoque, logística) | 8 | **CONSTRUIR_HF** |
| Gateway de tools + auditoria de agente | F/8 | **CONSTRUIR_HF** |

---

## 16. Ordem prática da onda (checklist de análise)

```text
[x] 0. PRD-Mestre (prédio) — v0.3
[ ] 1. CORRIGIR_HF P0/P1 + fechar D1 no PRD Fase 1
[ ] 2. Detalhar satélites Fase 1 (especificação, dados, aceite)
[ ] 3. Gate 01 Catálogo — REUSAR/ADAPTAR §§7–9 + WA; D5 Sidicom enviado
[ ] 4. PRD Fase 2 — pedidos + sync Sidicom; prep draft_order
[ ] 5. PRD Fase 3 — estoque; prep get_stock
[ ] 6. PRD Andar 6 — adapters 99/Uber + frete grátis
[ ] 7. PRD Andar 8 — agentes + humano no loop
[ ] 8. Andares 4/5/7/9/10 conforme gates do Mestre
```

---

## 17. Mapa rápido — tela HF → tabelas (funciona hoje?)

| Rota HF | Tabelas / RPC | Funciona? |
|---------|---------------|-----------|
| `/`, catálogo, busca, cat, marca | products*, search_products | Sim (published) |
| `/produto/:id` | products, images, refs, PVC | Sim + WA |
| `/veiculo` | manufacturers, models, VV, PVC | Sim |
| `/conta`, `/conta/perfil` | profiles, customers, customer_users | Sim |
| `/conta/veiculos` | customer_vehicles | **Não** (P0) |
| `/admin/produtos*` | products + filhos | Sim |
| `/admin/.../import*` | imports*, apply_* | Sim |
| `/admin/precos*` | price_lists* | Sim staff; loja off |
| `/admin/clientes\|grupos\|listas` | B2B | Sim admin |
| `/admin/operadores` | profiles | Sim |
| Carrinho / pedido / estoque / pay / frete | — | Ainda não no app (Sidicom) |

Detalhe: docs em `../runtime/`.

---

## 18. Roteiro para escrever o próximo PRD (Fase 1)

Use esta ordem na reunião de análise:

1. **Objetivo do andar** — o que o cliente e o admin conseguem fazer ao fim do Gate.  
2. **Dentro / fora** — copiar da §5 “Andar 1”; marcar NAO_TRAZER.  
3. **P0/P1** — §4 vira RF de correção no PRD.  
4. **D1** — catálogo público vs B2B autenticado (decisão explícita).  
5. **Dados** — §13: o que já existe; o que falta (`customer_vehicles`).  
6. **Integrações neste andar** — só WA + (estudo) Sidicom D5; **não** 99/Uber/IA prod.  
7. **Prep do prédio** — IDs/SKU estáveis; flags futuras documentadas.  
8. **Aceite / Gate 01** — checklist testável.  
9. **Próximo** — o que o Gate 01 libera (Fase 2 + D5).

Depois do Gate 01: repetir o mesmo roteiro para o Andar 2, usando §5 comercial + matrizes de pedidos.
