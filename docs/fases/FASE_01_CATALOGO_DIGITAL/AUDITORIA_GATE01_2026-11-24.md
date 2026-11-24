# Auditoria Gate 01 — Andar 1 Catálogo Digital

**Data:** 2026-11-24  
**Escopo:** Onda A — fechar Gate 01 (sem implementar GAPs P1 de feature)  
**Projeto Supabase:** `owllmfcpbodqmoerdfxx`  
**PRD:** [PRD_FASE_01.md](./PRD_FASE_01.md) · **Homologação:** [HOMOLOGACAO.md](./HOMOLOGACAO.md)

Legenda de achados: **BLOQUEIA_GATE** · **AJUSTE_DOC** · **WAIVER_POS_GATE** · **INFO**

---

## 1. Docs × decisões

| Tema | Evidência | Classe |
|------|-----------|--------|
| D1 published aberto + sem preço | Visão D1; `features.customer_specific_catalog_enabled=false`; `price_enabled=false` | INFO (OK) |
| D5 fora do Gate | Homologação / PRD / D5 pacote status opcional | INFO (OK) |
| D6 pedido oficial HF Andar 2 | Visão + Homologação | INFO (OK) |
| PRD §18 ainda “Sidicom SoT+D5” | [PRD_FASE_01.md](./PRD_FASE_01.md) linha integrações | **AJUSTE_DOC** |
| Spec WA “Sidicom/humano” | [ESPECIFICACAO_FUNCIONAL.md](./ESPECIFICACAO_FUNCIONAL.md) §3 item 4 | **AJUSTE_DOC** (texto ops) |
| Cruzamento GPT Sidicom SoT | [CRUZAMENTO_GPT_ANDAR1.md](./CRUZAMENTO_GPT_ANDAR1.md) histórico | INFO (evidência histórica; não reescrever) |
| Critérios v1.0 vs decisões 24/11 | C05/C06 já atualizados; bump versão | **AJUSTE_DOC** |
| Leads checklist sem processo escrito | Homologação “Leads/cotações chegam” unchecked | **BLOQUEIA_GATE** até registrar processo ops WA |

---

## 2. Código × RF (amostra Gate)

| RF | Estado runtime/código | Classe |
|----|----------------------|--------|
| RF-001 institucional | Rotas home/sobre/atendimento | INFO — smoke S01/S06 |
| RF-002/036 catálogo+sem preço | features + ProductCard/PDP | INFO (OK) |
| RF-003…010 busca/PDP/apps | search + VehiclePage + PVC | INFO — smoke |
| RF-011 posição PVC 3 eixos | produto tem posicao/lado; PVC sem | **WAIVER_POS_GATE** |
| RF-012 fab ≠ ano-modelo | VV.year simples | **WAIVER_POS_GATE** |
| RF-014 apps validadas | Sem status PVC | **WAIVER_POS_GATE** |
| RF-015/016 WA | `VITE_WHATSAPP_NUMBER` via business.ts; `.env.local` presente | INFO — smoke S07 |
| RF-017 leads módulo | Sem tabela | **WAIVER_POS_GATE** (+ processo ops fecha Gate) |
| RF-018–024 admin/import | Rotas StaffRoute | INFO — smoke D* |
| RF-025 campanhas | Destaques = latest published | **WAIVER_POS_GATE** |
| RF-031 customer_vehicles | migration_hf/12 + service + page | INFO — falta CRUD logado |
| RF-032 órfãos | favorite/adminCustomer/Placeholder removidos | INFO (OK) |
| RF-034 D5 | Opcional | INFO (fora Gate) |
| AddressForm órfão | Sem rota de página | INFO — adiar Andar 2+ |
| tokens de terceiros em `src/` | Nenhum match | INFO (OK) |

---

## 3. Runtime Supabase (MCP 2026-11-24)

| Métrica | Valor |
|---------|-------|
| products (all / published) | 52 / **49** |
| product_vehicle_compatibility | **384** |
| vehicle_versions | **186** |
| customers / customer_users | 1 / 1 |
| customer_vehicles rows | 0 |
| customer_vehicles tabela + RLS | **true** |
| Policies cvehicles_* | select/insert/update/delete (verify prévio) |

**Massa:** 49 published + 384 apps = cobertura mínima **aceitável para Gate** com nota de expansão contínua (não bloqueia).

Auth users existentes (sem expor PII em smoke público): 2 contas confirmadas no projeto (1 ligada a customer_users). Conta **teste Gate** a criar/resetar na Fase 1.

---

## 4. Higiene

| Check | Resultado | Classe |
|-------|-----------|--------|
| Tokens tokens de terceiros UI | Ausentes | INFO |
| `.env` na raiz | Ausente; **`.env.local`** com URL/anon/WA | INFO |
| secrets de terceiros no client | Não encontrados nesta auditoria | INFO |
| AddressForm + address/* | Órfãos de rota | INFO |

---

## 5. Resumo de classificação (pré-ajustes)

### BLOQUEIA_GATE (abrir e fechar nesta onda)

1. Processo leads/cotação não documentado no Gate (checklist).  
2. Smoke A04 CRUD `/conta/veiculos` logado ainda não executado.  
3. Checklist Homologação §2 majoritariamente unchecked (exige smoke + registro).  
4. Env: garantir WA em runtime local para S07 (`.env.local` já tem chave — validar no smoke).

### AJUSTE_DOC

1. PRD §18 Sidicom SoT+D5 → alinhar D6/D5 opcional.  
2. ESPECIFICACAO §3 item 4 — atendimento humano/ops (não implicar pedido oficial Sidicom no Andar 1).  
3. Critérios: versão/data Gate.  
4. Homologação: processo WA = leads; waivers P1; massa.

### WAIVER_POS_GATE

RF-011, RF-012, RF-014, RF-017 (módulo), RF-025 — **não implementar** nesta onda.

### INFO

D1/D5/D6, P0 schema, build/test baseline, órfão AddressForm.

---

## 6. Smoke — evidências (Fase 2 — 2026-11-24)

| ID | Caso | Resultado | Nota |
|----|------|-----------|------|
| S01 | Home | **OK** | Hero HF; sem preço; CTAs |
| S02 | Busca | **OK** | `/catalogo?q=pivo` → 13 produtos |
| S03 | PDP sem preço | **OK** | PVI0127; “Consultar esta peça”; apps |
| S04 | Categoria/marca | **OK** | Filtros + nav categorias/marcas |
| S05 | `/veiculo` | **OK** | Cascata montadora/modelo |
| S06 | Sobre/Atendimento | **OK** | Endereço Guarulhos + e-mail + WA footer |
| S07 | CTA WA | **OK** | `wa.me/5511994370003` com contexto peça |
| S08 | Mobile | **PARCIAL** | Layout responsivo existente; sem device lab |
| A01 | Login staff | **OK** | `gate01.staff@…` → `/admin` |
| A02 | Non-staff `/admin` | **OK** | Customer → redirect `/` |
| A03 | Conta perfil | **OK** | `/conta` mostra cliente B2B ativo |
| A04 | CRUD veículos | **OK** | Add Gol Gate01 → list → remove (DB 0) |
| D01–D07 | Admin amostra | **OK** | Dashboard, produtos, import hub, clientes |
| Q01 | `npm test` | **OK** | 55/55 |
| Q02 | `npm run build` | **OK** | Vite build |
| Q03 | Sem tokens de terceiros | **OK** | grep src vazio |
| Q05 | Anon published | **OK** | Catálogo público 49 published |

### Fixes aplicados nesta onda

| Achado | Ação |
|--------|------|
| `handle_new_user` quebrado (`customers.profile_id`) | Migration `13_fix_handle_new_user_hf_b2b` |
| Conta teste A04 | Customer + staff `gate01.*` criados (senha não no repo) |
| Docs Sidicom/D5 Gate | PRD §18 + ESPECIFICACAO §3 + Critérios v1.1 |

### BLOQUEIA_GATE remanescentes

**Nenhum.**

---

## 7. Conclusão

Gate 01 **tecnicamente pronto para assinatura do dono**, com waivers P1 explícitos. Próximo: assinatura Homologação §5 → planejamento Andar 2 após D7.
