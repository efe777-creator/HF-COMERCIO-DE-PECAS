# HF — Jornada Comercial (Andar 1)

**Data:** 2026-11-27  
**Status:** Documentação canônica + complemento técnico (prontidão para implementação). Sem código neste ciclo.  
**Escopo:** só HF. Vendedores entram no Andar 1. Pedido oficial / WhatsApp Cloud / e-mail auto = fora.  
**Antirregressão:** [HF_JORNADA_ANTIRREGRESS_SMOKE.md](./HF_JORNADA_ANTIRREGRESS_SMOKE.md)

**Specs:** [specs/](./specs/)  
**Relacionados:** [HF_CLIENTES_CADASTRO_PLANO.md](./HF_CLIENTES_CADASTRO_PLANO.md) · [HF_COTACAO_CESTA_PLANO.md](./HF_COTACAO_CESTA_PLANO.md) · [HF_COMUNICACAO_PLANO.md](./HF_COMUNICACAO_PLANO.md) · [MODELO_DE_DADOS.md](./MODELO_DE_DADOS.md) · [HF_PADRAO_TELAS_UX_OPERACIONAL.md](../../entrada/HF_PADRAO_TELAS_UX_OPERACIONAL.md)

---

## 1. Objetivo

O catálogo deixa de ser só consulta e passa a ser porta de entrada comercial: captar interesse → analisar → aprovar cliente (lista + condições + vendedor) → cotar multi-item → encaminhar ao vendedor via `wa.me` → encerrar manualmente na Central de Pedidos.

## 2. Vocabulário travado

| Termo | Significado |
|-------|-------------|
| Visitante | Navega sem conta |
| Interessado / solicitação | `leads` com `kind` ∈ `partner` \| `contact` |
| Cotação | `leads` com `kind=quote` + `lead_items` — **não** é pedido |
| Cliente | `customers` — status `pending` \| `active` \| `suspended` \| `inactive` |
| Vendedor padrão | `customers.default_seller_id` → `sellers` |
| Vendedor destinatário | `leads.recipient_seller_id` (só aquela cotação) |
| Pedido oficial | Andar 2 |
| Operador | Staff em `/admin/operadores` (`profiles.role`) — **≠** vendedor comercial |

Não adotar a cadeia Mestre §6.5 (`visitante→interessado→…`). Cliente usa só os quatro status acima. “Solicitação aprovada” = conversão para `customers`, não um status mágico em `leads`.

## 3. Decisões de modelagem

| Tema | Decisão |
|------|--------|
| Interessados | Reusar `leads` (partner/contact). Sem tabela paralela. |
| Cotação | Manter quote + items; estender: `customer_id`, `recipient_seller_id`, `close_reason`, timestamps encaminhamento/encerramento. |
| Vendedores | Nova `sellers` (nome, WhatsApp comercial, e-mail, status, `profile_id` opcional). |
| Aprovação → `active` | Obrigatório: lista assigned + condições explícitas (AVISTA conta se marcado) + vendedor padrão. Só staff. |
| Cadastro inicial | Uma entrada pública: `/cadastro-comercial` (alias `/seja-parceiro`). `/cadastro` = auth. |
| Guest cotação | WA da loja (`VITE_WHATSAPP_NUMBER`), sem picker. |
| Cliente `active` | Picker de vendedor; WA do destinatário. |
| Canais aviso | In-app agora; Cloud/e-mail depois. |

## 4. RACI (Andar 1)

| Ação | Admin/Gerente | Operador comercial | Vendedor | Cliente |
|------|---------------|--------------------|----------|---------|
| Aprovar / rejeitar solicitação | A/R | C (analisa) | — | — |
| Atribuir lista / condições / vendedor padrão | A/R | C | — | — |
| CRUD vendedores | A/R | — | — | — |
| Encerrar cotação (resultado + motivo) | A/R | R | C (retorno WA) | — |
| Montar cotação / escolher destinatário | — | — | — | R (`active`) |
| Negociar no WhatsApp | — | C | R | R |

## 5. Fluxo

```text
Visitante → Cadastro inicial (lead partner)
         → Central Pedidos · Solicitações
         → Aprovação com gates → customers active
         → Catálogo com preço da lista
         → Cotação (gate dados + vendedor se active)
         → wa.me destinatário
         → Central Pedidos · Cotações (encerrar manual)
Avisos in-app em cada evento aplicável (Comunicação)
```

## 6. Mapa de telas (jornada)

| Spec | Superfície | Rota | Estado |
|------|------------|------|--------|
| [A1](./specs/HF_SPEC_A1_HOME.md) | Home | `/` | Vivo — evoluir CTAs/origem |
| [A2](./specs/HF_SPEC_A2_CATALOGO_PDP.md) | Catálogo / Busca / PDP | existentes | Vivo |
| [A3](./specs/HF_SPEC_A3_CADASTRO_INICIAL.md) | Cadastro inicial | `/cadastro-comercial` | Parcial (SejaParceiro) |
| [A4](./specs/HF_SPEC_A4_AUTH.md) | Auth | `/cadastro`, `/login` | Vivo |
| [A5](./specs/HF_SPEC_A5_CONTA.md) | Conta | `/conta/*` | Vivo — exibir comercial |
| [A6](./specs/HF_SPEC_A6_COTACAO.md) | Cotação | `/cotacao` | Vivo — gate + vendedor |
| [B1](./specs/HF_SPEC_B1_PEDIDOS_VISAO.md) | Pedidos · Visão | `/admin/pedidos` | Vivo KPI-lite |
| [B2](./specs/HF_SPEC_B2_SOLICITACOES.md) | Pedidos · Solicitações | `/admin/pedidos/solicitacoes` | **Novo** |
| [B3](./specs/HF_SPEC_B3_COTACOES.md) | Pedidos · Cotações | `/admin/pedidos/cotacoes` | Vivo — evoluir |
| [C1](./specs/HF_SPEC_C1_CLIENTES.md) | Clientes | `/admin/clientes` | Vivo — gates + vendedor |
| [D1](./specs/HF_SPEC_D1_VENDEDORES.md) | Vendedores | `/admin/vendedores` | **Novo** |
| [E1](./specs/HF_SPEC_E1_COMUNICACAO.md) | Comunicação | `/admin/comunicacao` | Vivo — kinds novos |

`/admin/leads` = inbox técnico legado; operação comercial = Solicitações + Cotações na Central de Pedidos.

## 7. Conflitos resolvidos

| Conflito | Resolução |
|----------|-----------|
| Docs omitiam vendedores no Andar 1 | Plano funcional prevalece: vendedores **no** Andar 1 |
| MAPA_DE_TELAS flat `campanhas/leads/cotacoes` | Atualizar para Centrais + `/cotacao` + vendedores |
| MODELO_DE_DADOS leads “Proposto” | Em uso (`18_leads.sql` + UI) |
| Três intakes (SejaParceiro / Register / Admin) | Papéis distintos: interesse / credencial / cadastro oficial |
| Operadores vs vendedores | Entidades e telas separadas |
| `won`/`lost` no lead | Resultado de cotação/atendimento; aprovação = `customers.status` |

## 8. Fronteira Andar 1 / 2

**Andar 1:** captação, solicitações, aprovação, clientes, listas, condições, vendedores, cesta, `wa.me`, in-app, encerramento manual.  
**Andar 2:** pedido digital, estoque/reserva, expedição, fiscal/financeiro de pedido, WhatsApp Cloud.

## 9. Critérios de aceite (homologação futura)

1–21 do plano funcional: interesse registrado → fila Solicitações → análise → aprovação com lista/condições/vendedor → preço correto → cesta N itens → gate dados → destinatário sem alterar padrão → WA correto → cotação na Central → histórico → encerrar manual → avisos in-app → UX padrão HF desktop/mobile.

## 10. Antirregressão

Evoluir a jornada **sem quebrar** contratos vivos (cesta guest/active, Pedidos·Cotações, Clientes, Comunicação, preço, auth, operadores).

**Regras resumidas:** additive first · feature-detect seller/picker · gate `active` só em pending→active · aliases sem 404 · sem Graph/pedido/FAL.

**Checklist completo (CI, matriz R1–R9 / N1–N5, rollback, Toolkit MCP):**  
[HF_JORNADA_ANTIRREGRESS_SMOKE.md](./HF_JORNADA_ANTIRREGRESS_SMOKE.md)

Cada onda de implementação só fecha com R1–R9 verdes (+ N\* da onda). Deploy Hostinger só depois.

## 11. Implementação em 7 ondas (critérios de saída)

Ondas **sequenciais**. Compilar não basta: aceite + smoke da onda + R1–R9. Context7 no início de cada onda. Figma se MCP/link; senão browser + PADRAO.

### Onda 1 — Schema

| | |
|--|--|
| **Objetivo** | Estrutura additive: `sellers`, FKs, cols lead/customer, kinds, auditoria leve |
| **Arquivos** | `supabase/migrations_hf/<nome>_jornada_comercial_*.sql` — **confirmar nome livre** (há colisão de prefixos `32`–`35`; preferir `36_…` ou stamp datado após inventário) |
| **Dependências** | Nenhuma de código app |
| **Permitido** | `CREATE TABLE`, `ADD COLUMN` nullable, FKs, índices, CHECK, RLS, view/RPC picker, `commercial_events`, kinds no catálogo |
| **Restrições** | Não dropar policies insert públicas `leads`/`lead_items`; não DELETE físico de sellers com vínculo; sem Graph |
| **Vitest** | N/A (schema) |
| **Smoke** | Extensão T1–T5 antirregress; advisors Supabase |
| **Aceite** | FKs/índices/RLS/view públicos ok; app legado sobe sem erro |
| **Avançar** | Schema aplicado no projeto HF |
| **Rollback** | Não dropar cols em prod às pressas; feature UI off |

### Onda 2 — Vendedores (D1)

| | |
|--|--|
| **Objetivo** | CRUD Adaptive `/admin/vendedores` |
| **Arquivos** | `adminSellerService`, `pages/admin/vendedores/*`, `AdminLayout`, `router`, `adminWorkspacePrefs` |
| **Dependências** | Onda 1 |
| **Permitido** | Soft inactivate; realocação obrigatória se há clientes; staff admin/gerente |
| **Restrições** | ≠ operadores; público só via view/RPC (id, name, whatsapp) |
| **Vitest** | Service helpers se houver |
| **Smoke** | R\* + permissões seller |
| **Aceite** | Spec D1 |
| **Avançar** | R1–R9 verdes |
| **Rollback** | Esconder nav; tabela permanece |

### Onda 3 — Cadastro inicial + Solicitações (A3, B2, B1)

| | |
|--|--|
| **Objetivo** | `/cadastro-comercial` + fila Solicitações + KPIs |
| **Arquivos** | SejaParceiro→rota, `AdminPedidosSolicitacoesPage`, Layout, Home Pedidos, `leadService`, emit `request_received` |
| **Dependências** | Onda 1 (cols); Onda 2 desejável p/ aprovar com seller |
| **Permitido** | partner/contact; duplicidade CNPJ; rejeição com motivo; debounce |
| **Restrições** | Sem novo `leads.status`; `/admin/leads` legado |
| **Vitest** | Copy `request_received`; helpers CNPJ |
| **Smoke** | R9 + N solicitação |
| **Aceite** | Specs A3/B2/B1 |
| **Avançar** | R\* verdes |
| **Rollback** | Redirect Solicitações off; form antigo |

### Onda 4 — Gates Clientes (C1)

| | |
|--|--|
| **Objetivo** | Vendedor padrão + gate multi-path + aprovação transacional |
| **Arquivos** | `CustomerWorkSurface`, `adminB2bCustomerService` (`assertCustomerCanActivate`), RPC/serviço aprovar, conta A5 |
| **Dependências** | Ondas 1–3 |
| **Permitido** | Bloquear pending→active sem lista/condição explícita/seller active |
| **Restrições** | Não mass-suspend active sem seller; AVISTA explícito ≠ vazio histórico |
| **Vitest** | Gate unitário todos os paths |
| **Smoke** | N3 + T clientes |
| **Aceite** | Spec C1 + §13–§14 |
| **Avançar** | R5–R6 + gate |
| **Rollback** | Flag gate off (só emergência) |

### Onda 5 — Cotação (A6)

| | |
|--|--|
| **Objetivo** | Complementação + picker + WA destinatário |
| **Arquivos** | `CotacaoPage`, `quoteRomaneio`, `whatsapp`, `leadService`, Home UTM |
| **Dependências** | Ondas 1–2 (4 para seller padrão) |
| **Permitido** | Guest = WA loja; active = picker; fail notify soft |
| **Restrições** | Destinatário ≠ muda padrão; WA≠entrega |
| **Vitest** | Romaneio com/sem seller; gate campos |
| **Smoke** | R1–R2–R8 + N1–N2 |
| **Aceite** | Spec A6 |
| **Avançar** | R\* |
| **Rollback** | Picker off → WA loja |

### Onda 6 — Encerrar + kinds (B3, E1)

| | |
|--|--|
| **Objetivo** | Encerrar com motivo; kinds; bloquear status solto |
| **Arquivos** | `AdminPedidosCotacoesPage`, `adminUpdateLeadStatus`/`closeQuote`, `communicationCopy`+service |
| **Dependências** | Onda 1 kinds; Onda 5 forward |
| **Permitido** | won/lost + close_reason + closed_at; idempotência notify |
| **Restrições** | Select genérico não encerra sem fluxo; sem Graph |
| **Vitest** | Copy kinds; close validation |
| **Smoke** | N4–N5 + R7 |
| **Aceite** | Specs B3/E1 |
| **Avançar** | R\* + N4–N5 |
| **Rollback** | UI Encerrar feature-flag |

### Onda 7 — Smoke + deploy

| | |
|--|--|
| **Objetivo** | Matriz completa + Hostinger |
| **Arquivos** | Registro em antirregress smoke; branch `hostinger-static` |
| **Dependências** | Ondas 1–6 |
| **Permitido** | Deploy após R1–R9 + N\* verdes |
| **Restrições** | Sem FAL; sem Cloud |
| **Vitest** | Suite crítica full |
| **Smoke** | Browser prod/local |
| **Aceite** | Aceite 1–21 mestre |
| **Avançar** | — |
| **Rollback** | Build anterior hostinger-static |

---

## 12. Schema, integridade e segurança (Onda 1)

### 12.1 Foreign keys

| Coluna | Referência |
|--------|------------|
| `customers.default_seller_id` | `sellers.id` |
| `leads.customer_id` | `customers.id` |
| `leads.recipient_seller_id` | `sellers.id` |
| `sellers.profile_id` | `profiles.id` (nullable) |

### 12.2 Índices (mínimo)

- `sellers(status)`, `sellers(profile_id)` onde not null  
- `customers(default_seller_id)`  
- `leads(customer_id)`, `leads(recipient_seller_id)`, `leads(kind, status, created_at desc)` (já existe kind/status)  
- `commercial_events(entity_type, entity_id, created_at desc)`

### 12.3 Constraints e CHECK existentes

- **Não alterar** CHECK `leads.kind` / `leads.status` (`18_leads.sql`) sem migration justificada.  
- `sellers.status` ∈ `active` \| `inactive`.  
- Preferir **inativação** a DELETE; bloquear DELETE se `customers.default_seller_id` ou leads históricos apontam ao seller (ou ON DELETE RESTRICT).

### 12.4 `updated_at`

Seguir trigger/padrão já usado em `customers`/`leads` no projeto.

### 12.5 RLS

- Preservar policies **insert** públicas atuais de `leads` e `lead_items`.  
- `sellers`: RLS on; staff (admin/gerente) ALL; **não** dar `SELECT *` a anon na tabela base.  
- Picker: **view ou RPC** `sellers_public` / `list_active_sellers_public` expondo só `id`, `name`, `whatsapp` de status=active. RLS de tabela **não** mascara colunas — por isso a view/RPC é obrigatória.

### 12.6 Exposição pública

Proibido ao guest/authenticated genérico: e-mail interno, telefone interno, `profile_id`, notas staff.

---

## 13. Gate de ativação (multi-path)

### 13.1 Regra

Transição **somente** `pending → active` exige **todos**:

1. `assigned_price_list_id` NOT NULL (lista `scope=assigned`)  
2. Condição de pagamento **explícita** (pelo menos uma linha em `customer_payment_conditions`, inclusive AVISTA se for o caso)  
3. `default_seller_id` apontando seller `status=active`

### 13.2 Divergência documentada vs modelo atual

| Hoje (Clientes plano) | Gate jornada |
|----------------------|--------------|
| N:N vazio = “só À vista” implícito para **uso** comercial | Vazio **não** basta para **ativar** |
| Ativar sem checagem | Ativar só com 1+2+3 |

Uso de preço/condições na loja para quem já é `active` permanece; o gate não reescreve clientes active legados sem seller (não mass-suspend).

### 13.3 Centralização

Função única (ex. `assertCustomerCanActivate(customerId)` / RPC) chamada por:

- `adminSetCustomerStatus(..., 'active')`  
- `adminUpsertB2bCustomer` se `status` gravado como `active`  
- Qualquer RPC futuro de ativação  

Nenhum path pode gravar `status=active` contornando o assert.

---

## 14. Aprovação transacional da solicitação

Processo atômico (RPC Postgres preferencial; senão serviço com compensação documentada):

1. Criar ou atualizar `customers` (anti-duplicata CNPJ).  
2. `leads.customer_id` = customer.  
3. Lista assigned.  
4. Condições explícitas.  
5. Vendedor padrão.  
6. Validar gates (§13).  
7. Ativar se gates OK (senão fica `pending` completo — **não** “meio aprovado active”).  
8. Auditoria + avisos (`access_granted` se active; lead partner → `won` ou status operacional `in_progress` conforme UI — **aprovação cliente ≠ won cotação**).

**Falha:** rollback da unidade; retry idempotente (mesmo CNPJ/lead não cria segundo customer).  
**Repetir aprovação:** no-op seguro se já vinculado e active.

---

## 15. Duplicidade, rejeição e reabertura (Onda 3)

| Situação | Comportamento |
|----------|---------------|
| CNPJ já em `customers` | Avisar; não criar segundo customer; staff associa lead ao existente |
| Lead partner `new`/`in_progress` mesmo CNPJ | Atualizar dados ou bloquear novo com link à solicitação aberta |
| Solicitação rejeitada | Ver abaixo; reabertura = voltar `in_progress` com auditoria (se permitido) |
| Duplo clique / reenvio form | Idempotência client (disable) + server (dedupe curto por CNPJ+fonte) |

### Rejeição ≠ `lost` de cotação

- **Sem novo valor** em `leads.status`.  
- Rejeição de **solicitação** (`kind=partner`\|`contact`): `status=lost` + `rejected_at`, `rejected_by`, `rejection_reason` (cols additive) + evento auditoria + `access_rejected` se houver user.  
- Cotação (`kind=quote`) `lost`: `close_reason` + `closed_at` (encerramento comercial).  
- UI e relatórios **sempre** filtram por `kind`.

---

## 16. Histórico e auditoria comercial

Estrutura leve **`commercial_events`** (additive):

- `action`, `actor_profile_id`, `created_at`, `entity_type`, `entity_id`, `before_json`, `after_json`, `reason`

Ações mínimas: approve/reject solicitation · change default_seller · change recipient_seller · request_complement · quote_forward · quote_close · reopen (se houver).

Não é CRM: sem pipeline paralelo, sem tarefas genéricas.

---

## 17. Encaminhamento WhatsApp

- Abrir `wa.me` **não** prova envio/recebimento.  
- `forwarded_at` = início/intenção de contato + `recipient_seller_id` persistido.  
- Cotação permanece na Central mesmo se o usuário não concluir o envio no app WA.  
- Falha em emit in-app **não** desfaz `createLead` (padrão já usado em cotação/access).

---

## 18. Encerramento de cotações

| Regra | Definição |
|-------|-----------|
| Resultados | Só `won` \| `lost` |
| Obrigatório | `close_reason`, `closed_at`, actor (auditoria) |
| Quem | Admin/Gerente A; Operador R (**pendência confirmação** §21) |
| UI | Fluxo **Encerrar** dedicado; select genérico de status **não** pode setar won/lost sem motivo |
| Paths | Evoluir `adminUpdateLeadStatus` ou `closeQuoteLead` que valida; `AdminPedidosCotacoesPage` + `AdminLeadsPage` |
| Duplicata | Segundo encerrar bloqueado se já `closed_at` |
| Reabertura | **Pendência §21** — default documental sugerido: só admin; limpa `closed_at`/`close_reason` com evento; ou proibir e exigir nova cotação |

---

## 19. Comunicação e idempotência

### Matriz de eventos (kinds novos)

| Kind | Audience | Momento | Href típico | Copy |
|------|----------|---------|-------------|------|
| `request_received` | staff | Cadastro inicial / partner | `/admin/pedidos/solicitacoes?lead=` | **Pendência** título/body |
| `request_complement` | customer | Staff pediu complemento | `/conta` ou `/cadastro-comercial` | Pendência |
| `access_rejected` | customer | Rejeição solicitação/cadastro | `/conta/avisos` | Pendência |
| `quote_forwarded` | staff | Encaminhamento com destinatário | `/admin/pedidos/cotacoes?lead=` | Pendência |
| `quote_closed` | staff | Encerramento manual | `/admin/pedidos/cotacoes?lead=` | Pendência |

Preservar: `access_pending` · `access_granted` · `access_suspended` · `quote_requested` · `quote_sent`.  
Canal WhatsApp delivery: continuar `skipped` sem Graph.

**Idempotência:** reutilizar `source_event_id` / chave estável `(kind, entity_id, action)` para não duplicar em retry.  
**Fail soft:** operação comercial primeiro; notify em try/catch.

---

## 20. Complementos de dados

| Tema | Regra |
|------|--------|
| `source` | String livre / origem app (`cotacao-cesta`, `cadastro-comercial`, UTM compactado) |
| UTM | **Pendência §21** quais campos; até lá persistir em `source` ou JSON `attribution` se coluna existir |
| Perfil / interesse | Colunas text `business_profile`, `interest` em `leads` (partner) |
| Mínimo p/ encaminhar cotação (active) | Responsável, WhatsApp, e-mail, endereço principal (CEP + cidade + UF) |
| Seller inativo | Fora do picker; cotação antiga mantém FK; UI aviso |
| Inativar seller | Exigir realocação de `default_seller_id` dos clientes |
| Permissões | RACI §4; vendedor comercial **não** aprova; CRUD sellers = admin/gerente |
| Retenção | Dados comerciais conforme Privacidade HF; sem expor QSA/CPF parcial |

---

## 21. Pendências do responsável (não inventar em código)

1. Operador comercial encerra cotação sozinho? (RACI atual: R)  
2. Reabertura de cotação encerrada: permitir ou só nova cotação?  
3. UTM exatos a persistir (`utm_source` / `medium` / `campaign` vs só `source`)  
4. Nome final do arquivo de migration (inventário `32`–`35` duplicados)  
5. Copy PT-BR final dos kinds novos  

---

## 22. Divergências doc ↔ código (baseline)

| Área | Código hoje | Doc jornada |
|------|-------------|-------------|
| Gate active | Ausente em `adminSetCustomerStatus` | Obrigatório multi-path |
| Encerrar | Status select sem motivo | Motivo + closed_at |
| Sellers | Não existe | Onda 1–2 |
| Solicitações Pedidos | Só Cotações no menu | + Solicitações |
| AVISTA | Vazio = implícito | Explícito para ativar |
| Notify fail | Já soft em vários emits | Manter e generalizar |
