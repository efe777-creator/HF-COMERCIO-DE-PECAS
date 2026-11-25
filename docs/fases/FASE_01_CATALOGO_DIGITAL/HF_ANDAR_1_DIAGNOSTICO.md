# HF Andar 1 — Diagnóstico completo (E0)

**Data:** 2026-11-24  
**Status:** ENTREGUE — aguarda aprovação para E1  
**Projeto:** `hf-comercio-de-pecas` · Supabase `owllmfcpbodqmoerdfxx`  
**Método:** IVTSAV · Plano integrado Prompt Mestre GPT + 14 módulos HF  
**Gate 01:** baseline técnico DONE ([AUDITORIA_GATE01_2026-11-24.md](./AUDITORIA_GATE01_2026-11-24.md)) — **não substitui este diagnóstico**  
**Fonte externa:** somente leitura; **permitido reutilizar/adaptar** libs e UI técnica para HF; **proibido** escrever na projeto de terceiros / regras comerciais de terceiros / Adaptive / 3D / equivalência / checkout  

---

## 1. Objetivo da E0

Auditar o que existe, classificar M01–M14, listar lacunas, riscos e o que **não** alterar — **sem implementar features nesta etapa**.

---

## 2. Estado atual (síntese)

| Dimensão | Situação |
|----------|----------|
| Stack | React 19 · Vite · RR7 · Tailwind 4 · Supabase — **manter** |
| Site vivo | hfcomerciodepecas.com — catálogo B2B sem preço (D1) |
| Gate 01 | Smokes S/A/D/Q OK; assinatura dono pendente em HOMOLOGACAO |
| Massa (Gate) | ~49 published · 384 PVC · 186 VV |
| Problema central | Fundação **operacional incompleta**: apps sem anos na UI/RPC, sem hub aplicações, sem motor compat, sem campanhas/cotações/leads/parceiro, form produto raso |
| Direção | Evoluir HF existente — **não** reconstruir · **não** 2ª DB |

---

## 3. Estrutura do repositório

| Área | Conteúdo |
|------|----------|
| `src/` | app, components, config, contexts, hooks, lib, pages, services, styles, types |
| `supabase/migrations_hf/` | **SoT** migrações HF (20 arquivos) |
| `supabase/migrations/` | legado — não aplicar indiscriminadamente |
| `docs/` | entrada, fases/FASE_01, auditoria/fonte, operação, arquitetura |
| Deploy | Hostinger (`.hostinger`) · Vite `dist` |

**Não alterar:** pasta do projeto de terceiros.

---

## 4. Feature flags (`src/config/features.ts`)

| Flag | Valor | Nota |
|------|-------|------|
| catalog_enabled | true | OK |
| customer_login_enabled | true | OK |
| customer_specific_catalog_enabled | false | D1 aberto |
| price_enabled | false | D1 — manter |
| quotation_enabled | false | Ligar quando M09 existir |
| ecommerce / cart / checkout / payment / orders / inventory / freight | false | **Não ativar** Andar 1 |
| vehicle_plate_enabled | false | Manter OFF |

---

## 5. Rotas

### Públicas (existentes)

`/` · `/catalogo` · `/busca` · `/categorias` · `/categoria/:slug` · `/marcas` · `/marca/:slug` · `/produto/:id` · `/veiculo` · `/sobre` · `/atendimento` · auth · `/conta/*`

**Ausentes Andar 1:** `/seja-parceiro` · `/privacidade` · formulário cotação dedicada · campanhas públicas além de destaques.

### Admin (existentes)

| Rota | Papel |
|------|-------|
| `/admin` | Dashboard (atalhos) |
| `/admin/produtos` (+ novo/:id) | Produtos |
| `/admin/produtos/importacoes` (+ trilhas) | Import hub |
| `/admin/categorias` | Categorias |
| `/admin/fabricantes` | Marcas |
| `/admin/montadoras` | Montadoras |
| `/admin/veiculos` | Modelos/versões |
| `/admin/fornecedores` (+ imports) | Fornecedores |
| `/admin/precos` (+ :id) | **Listas de preços** (staff) |
| `/admin/listas` | Catálogos B2B |
| `/admin/clientes` · `/grupos` | B2B |
| `/admin/operadores` | Permissões |

### Admin a criar (plano)

| Rota | Papel |
|------|-------|
| `/admin/aplicacoes` | **Hub aplicações** (separado de produtos) |
| `/admin/campanhas` | CRUD campanhas |
| `/admin/cotacoes` | Solicitações |
| `/admin/leads` | Leads + filtro parceiro **ou** `/admin/parceiros` separado |

**Decisão de arquitetura admin (Definido no diagnóstico):**  
**SEPARAR** cadastro/controle em telas: **Produtos** · **Aplicações** · **Listas de preços** · demais mestres · comercial (campanhas/cotações/leads) · importações · operadores.

Apps continuam editáveis **também** no form do produto; hub global é visão operacional.

---

## 6. Banco (migrations_hf) — o que atende / o que falta

### Atende Andar 1 (reusar)

`products`, `product_references`, `product_images`, `product_categories`, `product_brands`, `manufacturers`, `models`, `vehicle_versions`, `product_vehicle_compatibility` (com `year_start`/`year_end`/`notes`), imports pipeline, price_lists*, customers/groups/catalogs, `customer_vehicles`, profiles/roles, RLS, storage imagens, RPC `search_products`.

### Lacunas estruturais (precisa migration HF — sem 2ª estrutura)

| Gap | Impacto |
|-----|---------|
| PVC sem `posicao`/`lado` / 3 eixos na **aplicação** | RF-011 |
| Sem `validation_status` na PVC | RF-014 |
| `models` sem `production_year_*` | RF-012 |
| `search_products` usa `vv.year` **exato**, ignora faixa PVC | Fitment incorreto |
| Sem `campaigns` | M08 |
| Sem `leads` / itens de cotação | M09–M11 |
| Sem `is_featured` (ou campanha) | Home |
| Sem `product_kit_components` / `product_kind` | Kits |
| Admin manual PVC **sem** gravar/ler years na UI | Operador cego ao período |

**Antes de migrar (E1/E4):** apresentar necessidade, impacto e reversão por migration.

---

## 7. Classificação M01–M14

| Módulo | Classe | Evidência / lacuna |
|--------|--------|-------------------|
| M01 Identidade | Parcial / validado visual base | `--hf-*`, Logo, business.ts; endurecer consistência |
| M02 Presença | Funcional com limitações | Home/Sobre/Atendimento; falta privacidade; copy D1 a revisar |
| M03 Catálogo | Parcial | CRUD raso; falta 8 grupos explícitos, seção refs/imagens nível produção |
| M04 Inteligência veicular | Parcial | Admin veículos OK; falta vida de linha modelo |
| M05 Aplicações | Parcial / falhas de runtime | Import years OK; UI/RPC/posição/validação fracos |
| M06 Pesquisa | Parcial | Texto/cat/marca/veículo; falta 7 caminhos + selos + years PVC |
| M07 PDP | Funcional com limitações | Refs/apps string/WA; falta apps estruturadas + CTA cotação persistente |
| M08 Campanhas | Não implementado | Destaques = latest published |
| M09 Cotações | Não implementado | Só WA; flag off |
| M10 Leads | Não implementado | Sem tabela |
| M11 Seja parceiro | Não implementado | Sem rota |
| M12 Administração | Parcial | Telas Gate; falta hub apps + comercial + KPIs reais |
| M13 Importações | Funcional / validado Gate | Endurecer histórico UI + runbook |
| M14 Segurança/QA | Parcial | RLS+Staff OK; expandir testes/smoke Homolog 1.1 |

---

## 8. Matriz reutilizar/adaptar da fonte de referência (autorizado)

**Regra:** ler fonte → copiar para HF → adaptar tokens/shell. Zero write em fonte.

| Capacidade | Path fonte (referência) | Ação HF |
|------------|----------------------|---------|
| Ano PVC | `fonte-pecas/src/lib/vehicleAppYear.ts` | **COPIAR** + testes |
| Cascata PVC | `fonte-pecas/src/lib/pvcVehicleCascade.ts` | **COPIAR** |
| Motor compat | `fonte-pecas/src/services/compatibility/compatibilityEngine.ts` | **COPIAR** |
| Evidência PVC | `…/loadPvcEvidence.ts` | **COPIAR** |
| Editor apps | `…/ProductApplicationsEditor.tsx` | **ADAPTAR** |
| Hub apps | `AdminApplicationsPage` + service | **ADAPTAR** |
| Search years SQL | mig search year_range fonte | **ADAPTAR** em migrations_hf |
| Refs/imagens seções | AdminProduct*Section | **ADAPTAR** |
| Kits BOM | `product_kit_components` + UI | **ADAPTAR** schema+UI sem preço |
| Checklist release | `releaseChecklist.ts` | **ADAPTAR** sem preço |
| Garage lite / selos | GarageContext lite, badges | **ADAPTAR** |
| Adaptive / 3D / equiv / checkout / CRM rico | — | **NAO_TRAZER** |

---

## 9. Problemas e riscos

| ID | Risco | Severidade |
|----|-------|------------|
| R1 | Busca por ano ignora `year_start/end` PVC | P1 fundação |
| R2 | Operador não edita período na UI | P1 |
| R3 | Waivers RF-011/014/017/025 ainda abertos | P1/P2 |
| R4 | Dupla trilha migrations (`01…13` + foundation) | P2 ops |
| R5 | Massa refs baixa (RF-005 parcial) | P2 |
| R6 | Homologação Gate sem assinatura dono | P2 governança |
| R7 | Confundir lista de preços staff com preço público | P0 se vazar — flag off mitiga |

**Não alterar sem necessidade:** pipeline import 06*, D1 flags, RLS published, rotas públicas estáveis, price lists staff.

---

## 10. Proposta de execução (após aprovação E0 → E1)

| Etapa | Conteúdo |
|-------|----------|
| E1 | Pacote 10 docs + plano migrations com reversão |
| E2 | M01–M02 |
| E3 | M03 Produtos 8 grupos (copiar seções fonte) |
| E4 | M04–M05 + hub `/admin/aplicacoes` (copiar editor/libs) |
| E5 | M06–M07 + motor G5 + search years |
| E6 | M08 Campanhas |
| E7 | M09–M11 Cotações/Leads/Parceiro |
| E8 | M12–M13 Admin/Import |
| E9–E11 | Segurança, regressão, Homologação Andar 1 |

Ciclo por etapa: **Implantação → Validação → Ajuste → Teste smoke → Ajuste → Validação**.

---

## 11. Funcionalidades que não deverão ser alteradas (salvo bug)

- Decisão D1 (published aberto, sem preço público).  
- Flags comerciais futuras (cart/checkout/orders…).  
- Contas e RLS `customer_vehicles`.  
- Import apply “apps não criam produto”.  
- Identidade institucional confirmada em `business.ts` / HF_IDENTIDADE_VISUAL.  
- projeto de terceiros inteiro.

---

## 12. Critério de aceite desta E0

- [x] Inventário rotas, flags, migs, testes  
- [x] Classificação M01–M14  
- [x] Lacunas DB listadas  
- [x] Matriz de referência reuso técnico  
- [x] Admin separado: Produtos · Aplicações · Preços · demais  
- [ ] **Aprovação humana** para iniciar E1  

**Próximo:** E1 `HF_ANDAR_1_PLANO_IMPLANTACAO.md` + matriz requisitos — **ainda sem feature code** até aprovação E1.
