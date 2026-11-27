# HF — Jornada Comercial · Antirregressão e smoke

**Data:** 2026-11-27  
**Mestre:** [HF_JORNADA_COMERCIAL_PLANO.md](./HF_JORNADA_COMERCIAL_PLANO.md) (§11–§22 técnicos)  
**Specs:** [specs/](./specs/)  
**Escopo:** checklist de PR/deploy ao implementar a jornada. Sem Graph API, sem pedido Andar 2, sem editar FAL.  
Cada onda: R1–R9 + extensão T/C/S/Q/K aplicável à onda.

---

## 1. Objetivo

Evoluir Solicitações · Vendedores · gates · picker · encerrar **sem quebrar** o que já está ao vivo (cesta, Central Pedidos·Cotações, Clientes Adaptive, Comunicação, preço assigned, Finanças).

Cada onda de implementação só fecha com **R1–R9 verdes** (+ N\* da onda).

---

## 2. Contratos que não podem regredir

| Contrato | Quebra = regressão |
|----------|-------------------|
| Cotação guest | `createLead(quote)` + items + WA loja (`VITE_WHATSAPP_NUMBER`) + `quote_requested` |
| Cotação active | Preço da lista assigned; `quote_sent` se logado |
| `/admin/pedidos/cotacoes` | Adaptive lista+guia+itens+`?lead=`+redirect `/admin/cotacoes` |
| `/admin/clientes` | Adaptive; CNPJ; lista assigned; condições; Ativar/Suspender (gates **somam** bloqueio, não removem fluxo) |
| Comunicação | kinds existentes + hrefs; delivery `whatsapp=skipped` |
| Preço vitrine | Guest nunca vê preço; `price_enabled` global off |
| Auth | `/cadastro` ≠ cadastro comercial; Register permanece |
| Operadores | `/admin/operadores` permanece; vendedores **não** substituem |

---

## 3. Regras de mudança segura

1. **Additive first** — colunas / `sellers` / kinds novos com default null/off; UI antiga continua se seller ausente (guest → WA loja).  
2. **Feature detect** — picker e gate complementação só se `customerStatus==='active'`; sem seller padrão → fallback WA loja + aviso staff (**não** hard-fail envio).  
3. **Gate `active`** — só na transição pending→active; clientes **já active** sem vendedor permanecem active (backfill separado; não mass-suspend).  
4. **Rotas** — aliases `/seja-parceiro`, `/admin/cotacoes`, `/admin/leads` não 404.  
5. **Sem** Graph API / pedido oficial / edição FAL em qualquer PR da jornada.

---

## 4. Gates CI / PR (antes de merge)

```text
pnpm exec tsc --noEmit   # ou pnpm build
pnpm exec vitest run src/lib/communicationCopy.test.ts src/lib/quoteBasket.test.ts
# Após onda: + testes de gate active, kinds novos, romaneio com/sem seller
```

Diff review:

- Migrations só **additive** (`ALTER TABLE … ADD COLUMN` nullable; `CREATE TABLE sellers` + RLS).  
- **Não** dropar policies insert públicas de `leads` / `lead_items`.  
- RLS on em tabela nova; policies granulares por operação/role (anon/authenticated/staff).

---

## 5. Matriz smoke

### R — Regressão (sempre verde)

| # | Caso | Esperado |
|---|------|----------|
| R1 | Guest add→`/cotacao`→enviar | lead + items + WA loja + aviso staff |
| R2 | Active vê preço / guest não | lista assigned |
| R3 | Admin `/admin/pedidos/cotacoes?lead=` | guia + itens |
| R4 | `/admin/cotacoes` | redirect → `pedidos/cotacoes` |
| R5 | Clientes salvar + lista + condições | persiste |
| R6 | Ativar cliente (fluxo atual) | `active` + `access_granted` |
| R7 | Comunicação kinds antigos | `access_*` / `quote_*` |
| R8 | Mobile sticky PDP + badge Cotação | acima do MobileNav |
| R9 | Seja parceiro / cadastro comercial | lead partner na fila (leads ou Solicitações) |

### N — Novidade (exigir após a onda correspondente)

| # | Caso | Esperado | Onda |
|---|------|----------|------|
| N1 | Active + seller: picker + WA destinatário | não altera `default_seller_id` | CotacaoPage + sellers |
| N2 | Active incompleto: modal antes de enviar | completa e segue | CotacaoPage |
| N3 | Gate active sem lista/vendedor | bloqueia com mensagem | Clientes |
| N4 | Encerrar cotação sem motivo | bloqueia | Pedidos·Cotações |
| N5 | Kinds novos in-app; WA delivery skipped | `request_*` / `quote_closed` etc. | Comunicação |

### Extensão técnica — Banco e permissões (T)

| # | Caso | Esperado |
|---|------|----------|
| T1 | Migration aplicada | Policies insert `leads`/`lead_items` intactas |
| T2 | FKs e índices | `default_seller_id`, `customer_id`, `recipient_seller_id`, `profile_id` válidos |
| T3 | Anon/authenticated SELECT sellers base | Sem e-mail/`profile_id`; só view/RPC pública |
| T4 | Perfil sem permissão | Não cria/edita/inativa vendedores |
| T5 | DELETE seller com clientes/histórico | Bloqueado (RESTRICT / app) |

### Extensão — Clientes (C)

| # | Caso | Esperado |
|---|------|----------|
| C1 | Ativar sem lista | Bloqueado |
| C2 | Ativar sem condição explícita (N:N vazio) | Bloqueado |
| C3 | Ativar sem vendedor padrão active | Bloqueado |
| C4 | `adminSetCustomerStatus` e upsert com active | Mesmo gate |
| C5 | Cliente já `active` sem seller | Continua active (não mass-suspend) |

### Extensão — Solicitações (S)

| # | Caso | Esperado |
|---|------|----------|
| S1 | CNPJ já customer / lead aberto | Regra §15 (aviso, sem duplicar) |
| S2 | Aprovação repetida | Sem segundo customer |
| S3 | Falha mid-aprovação | Sem estado active parcial |
| S4 | Rejeição | Motivo + responsável + data (`rejection_*`) |
| S5 | Reabertura | Só se regra §21 permitir |

### Extensão — Cotações (Q)

| # | Caso | Esperado |
|---|------|----------|
| Q1 | Falha emit aviso | Lead/items permanecem |
| Q2 | Abrir wa.me | `forwarded_at` ≠ confirmação de entrega |
| Q3 | Encaminhar | `recipient_seller_id` persistido |
| Q4 | Encerrar sem motivo / sem fluxo | Bloqueado |
| Q5 | Encerrar duplicado | Bloqueado se `closed_at` |
| Q6 | Reabertura | Conforme §21 |

### Extensão — Comunicação (K)

| # | Caso | Esperado |
|---|------|----------|
| K1 | Retry operação | Sem notify duplicada (idempotência) |
| K2 | Cada kind | Audience/href da matriz §19 |
| K3 | `access_*` / `quote_requested` / `quote_sent` | Continuam |
| K4 | Delivery WhatsApp | `skipped` sem Graph |

---

## 6. Rollback / compat

- Feature flag ou menu: esconder Solicitações / Vendedores / picker **sem** dropar colunas.  
- `sellers` vazia → cotação active = comportamento atual (WA loja).  
- Deploy Hostinger **somente** com R1–R8 verdes na build.

---

## 7. Toolkit MCP (obrigatório na execução)

### Context7

Consultar docs atuais no início de cada onda (não inventar API de memória):

| Biblioteca | ID | Uso |
|------------|-----|-----|
| Vitest | `/vitest-dev/vitest` | `vitest run` com filtros; coverage thresholds por glob em libs críticas |
| Supabase | `/websites/supabase` | migrations additive; RLS granular; preservar insert público leads |
| React Router | `/remix-run/react-router` | `<Navigate replace />`; deep-link `?lead=`; aliases sem 404 |

### Figma

Se MCP Figma ou link de arquivo estiver disponível: confrontar frames Solicitações / Vendedores / passos Cotação com `HF_PADRAO` (lista→guia→ficha, `--hf-*`).  
Sem Figma: browser MCP + specs textuais — **não** inventar design system paralelo.

### Outros MCPs

| MCP | Quando |
|-----|--------|
| `cursor-ide-browser` | Smoke R\* / N\* em prod ou localhost |
| `user-supabase` | Pós-migration: advisors + list_tables; sem SQL destrutivo |
| `user-hostinger-api` | Deploy só com R1–R8 verdes |
| `user-github` | Checklist antirregress no body do PR |

### Fluxo por onda

```text
Context7 → código additive → Vitest críticos → Browser R*
→ Supabase advisors (se migration) → Hostinger
→ (Figma) review visual se disponível
```

---

## 8. Registro de execução

| Data | Onda | R1–R9 | N\* | Build | Deploy | Notas |
|------|------|-------|-----|-------|--------|-------|
| 2026-11-27 | O1 schema | T1–T5 OK (migration 40+41) | — | tsc OK | remote apply | sellers + leads cols + kinds |
| 2026-11-27 | O2–O6 app | R9/N3–N5/C*/Q*/K* no código | picker+close+kinds | tsc+Vitest copy/basket | O7 | Adaptive vendedores/solicitações/gates |
| 2026-11-27 | O7 deploy | R9 rotas/assets 200 | full suite | prod OK | Hostinger git+zip | `hostinger-static` adbde80 |
