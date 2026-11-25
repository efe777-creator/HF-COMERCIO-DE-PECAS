# Auditoria consolidada HF — baseline 2036

**Data:** 2026-11-23  
**Status:** CANÔNICO (evidência)  
**Escopo:** app `hf-comercio-de-pecas`, docs atuais, protótipo `SITE HF HTML`, linhagem metodológica de referência (somente leitura)

Documentos satélite: `HF_INVENTARIO_DOCUMENTOS.md`, `HF_INVENTARIO_CODIGO_RUNTIME.md`, `HF_LINHAGEM_METODOLOGIA.md`, `HF_GAPS_VS_PRD_MESTRE_20.md`.

---

## 1. Sumário executivo

A HF saiu de um **protótipo de apresentação** (HTML + conversão referência→HF) para um **MVP de catálogo B2B** homologável: auth, admin, importação, taxonomia, aplicações, WhatsApp, RLS, deploy Hostinger. Comércio (preço na vitrine, carrinho, pedido, estoque, frete, pagamento) está **preparado no admin/SQL ou legado externo**, mas **desligado** no runtime.

| Veredito | Conteúdo |
|----------|----------|
| **Pronto** | Cadastro e operação de catálogo; admin; import CSV/XLSX; busca; aplicações; WhatsApp; deploy; staff |
| **Parcial** | B2B por cliente/lista (admin + schema OK; vitrine ainda **pública** via flag/migration 08); pricing staff (UI+RPC; sem preço público) |
| **Ausente** | Visão/PRD-Mestre 2036, org/operação física, ERP/fiscal, logística, KPIs, IA, expansão 10 anos |
| **Contraditório** | Docs e checklists falam “catálogo autenticado”; runtime abre published para anônimo |

**Baseline oficial desta auditoria:** adequada para **cadastro real de catálogo** e atendimento via WhatsApp. **Não** é baseline de ERP, logística, financeiro ou agentes de IA.

A HF **não é a referência**. a referência empresta stack e disciplina documental; o norte HF é distribuidora + delivery + expansão nacional + CORE próprio.

---

## 2. Matriz dos 20 blocos PRD-Mestre × status

Legenda: `doc` = documentado | `code` = no código | `parcial` | `ausente`

| # | Bloco | Status | Evidência principal |
|---|-------|--------|---------------------|
| 01 | Identidade, visão e estratégia 2036 | parcial | `business.ts`, SITE HTML; sem visão 2036 canônica |
| 02 | Modelo de negócio e posicionamento | parcial | Tagline B2B; sem economia/canais formalizados |
| 03 | Estrutura física e organizacional | ausente | Endereço Guarulhos só em config |
| 04 | Departamentos, equipes, RACI | ausente | Admin implica funções, sem RACI |
| 05 | Operação completa da distribuidora | parcial | Import/fornecedores; sem CD/SLA/picking |
| 06 | HF CORE — arquitetura do sistema | parcial | `ARQUITETURA_HF.md` (SPA+Supabase); sem mapa enterprise |
| 07 | CRM, ERP e gestão comercial | parcial | Clientes/grupos B2B; sem ERP |
| 08 | Catálogo inteligente | doc+code | `MODELO_CATALOGO`, search, aplicações — **núcleo forte** |
| 09 | Estoque, compras e fornecedores | parcial | Fornecedores + custo/conversão admin; estoque off |
| 10 | Logística e distribuição | ausente | Removido do runtime; legado externo não aplicar |
| 11 | Financeiro, fiscal e faturamento | ausente | — |
| 12 | Portal B2B, app e e-commerce | parcial | Portal catálogo vivo; e-commerce fases 8–12 off |
| 13 | WhatsApp e agentes de IA | parcial | CTA WA done; agentes ausentes |
| 14 | Marketing, aquisição e relacionamento | parcial | Sobre/Home/Instagram; sem CRM marketing |
| 15 | Dados, indicadores e BI | ausente | Só checklists de homologação |
| 16 | Segurança, infra e governança | parcial | RLS, deploy, staff bootstrap; sem PRD segurança |
| 17 | Inovação e novos negócios | ausente | — |
| 18 | Expansão nacional 10 anos | ausente | — |
| 19 | Roadmap de implantação | parcial | `ROADMAP_HF` fases 1–7; sem mapa 20 blocos |
| 20 | RF/RNF e critérios de aceite | parcial | `HOMOLOGACAO`, `ACEITE_UX`; aceite enterprise ausente |

Detalhe e prioridades: `HF_GAPS_VS_PRD_MESTRE_20.md`.

---

## 3. Matriz de domínio runtime

| Domínio | Status | Notas |
|---------|--------|-------|
| Auth | DONE | Login, cadastro, recuperação, `/conta`, staff + `StaffRoute` |
| Catálogo | DONE | Published + busca + categorias + marcas + PDP |
| Aplicações | DONE | `/veiculo`, compat, admin veículos + import apps |
| Import | DONE | Hub, produtos, apps, HF bundle, conversões, custos |
| Admin | DONE | CRUD catálogo, taxonomia, fornecedores, preços, B2B, operadores |
| B2B clientes/listas | PARTIAL | Schema + admin; `customer_specific_catalog_enabled: false` |
| Pricing | PARTIAL | Admin + RPCs; `price_enabled: false` na vitrine |
| Estoque | MISSING | Flag off; sem UI/serviço operacional |
| Cart/Orders | MISSING | Sem rotas; órfãos de código; legado externo em `migrations/` |
| WhatsApp | DONE | Só via `VITE_WHATSAPP_NUMBER` |
| Deploy | DONE | `DEPLOY_HOSTINGER.md`, branch `hostinger-static` |
| Security/RLS | DONE | `migrations_hf/04_rls.sql` + políticas públicas em `08` |

Detalhe: `HF_INVENTARIO_CODIGO_RUNTIME.md`.

---

## 4. Conflitos documentais prioritários

| ID | Conflito | Fontes | Resolução recomendada |
|----|----------|--------|------------------------|
| C1 | Catálogo **público** vs **B2B autenticado** | README, `MODELO_CATALOGO` (“catálogo público”) vs `HOMOLOGACAO`, `PRD_UX` aceite visitante com gate | Decisão de produto no Bloco 01/12; até lá documentar **fato runtime**: published aberto (`features` + migration 08) |
| C2 | Gate login no checklist vs flag false | `HOMOLOGACAO` “Gate login catálogo” vs `customer_specific_catalog_enabled: false` | Atualizar homologação ou ligar flag — decisão explícita |
| C3 | Foundation “em andamento” vs “Feito” | `PRD_HF_B2B_1.0` vs `ROADMAP_HF` / `HOMOLOGACAO` | PRD B2B v1.0 precisa bump de status ou promoção a anexo do PRD-Mestre |
| C4 | Ponteiros `docs/entrada/` fantasma | `architecture.md`, `data-model-future.md` | Redirecionar para `docs/arquitetura/*` (Fase B desta marcha) |

---

## 5. Dívida técnica (código)

**Revisão 2026-11-24+:** `favoriteService` e `adminCustomerService` **removidos**. `filterProductIdsByVehicle` **removido** (vitrine usa só `search_products`). Seletor de anos públicos alinhado à faixa PVC (`buildYearsByModel` + mig. 16). Andar 1 smoke/validação supersede backlog antigo L05–L13/L09.

| Item | Risco | Ação sugerida (ciclo futuro) |
|------|-------|------------------------------|
| `AddressForm` + `services/address/*` sem uso | Preparado órfão | Manter só se fase endereço existir |
| Flags comerciais / `catalog_enabled` pouco lidas | Falsa sensação de gate | Wire ou documentar “declarativas” |
| Overlap `01`–`11` vs `20261007190000_hf_f1_foundation.sql` | Fresh DB ambíguo | Runbook: um caminho só |
| 52 SQL em `supabase/migrations/` | aplicação acidental de legado externo | Já marcado LEGACY — reforçar no SoT |
| Homologação Andar 1.1 / Playwright CI | Sem E2E autenticado em CI | Credenciais `E2E_STAFF_*` + suite |

---

## 6. O que a apresentação/protótipo entregou vs o que falta

**Entregue (útil):** identidade básica Guarulhos, escopo suspensão/direção/freios, catálogo digital, admin de cadastro, importação, caminho WhatsApp, deploy público.

**Incompleto para a empresa 2036:** planta organizacional, operação de CD/delivery, CORE como mapa de domínios, CRM/ERP, fiscal, logística, IA, KPIs, expansão, critérios de aceite por bloco.

---

## 7. Veredito e próximos passos

1. Tratar esta pasta `docs/auditoria/` como **evidência canônica** do estado 2026-11-23.  
2. Adotar suíte documental em `docs/entrada`, `docs/arquitetura`, `docs/operacao` (Fase B).  
3. Fechar Bloco 01 (visão) + decisão C1/C2 (catálogo aberto vs login) antes de ligar fases 8–12.  
4. Não portar PRD/regras de produto fonte; portar só **método** de governança (`HF_LINHAGEM_METODOLOGIA.md`).

**Assinatura de auditoria:** baseline de catálogo B2B + admin — **aprovada com ressalvas** (conflitos C1–C4 e gaps 01–05 / 10–11 / 15 / 17–18).
