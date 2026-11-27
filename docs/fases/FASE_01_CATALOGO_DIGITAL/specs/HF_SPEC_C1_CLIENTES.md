# Spec C1 — Clientes B2B (ampliação jornada)

**Rota:** `/admin/clientes`  
**Estado:** Vivo Adaptive — gates + vendedor padrão  
**moduleKey:** `customers`  
**Base:** [HF_CLIENTES_CADASTRO_PLANO.md](../HF_CLIENTES_CADASTRO_PLANO.md)  
**Mestre:** [HF_JORNADA_COMERCIAL_PLANO.md](../HF_JORNADA_COMERCIAL_PLANO.md)

## Objetivo

Cadastro oficial; aprovação/ativação com condições comerciais completas.

## Hierarquia

Lista → Guia (Identidade · Contato · Endereço · Comercial · Acesso · Crédito placeholder) → Ficha longa se necessário

## Lista — evoluções

Colunas/indicadores: + Vendedor padrão · Sem lista · Sem vendedor · Cadastro incompleto  

Filtros: ativos · pending · suspensos · sem lista · sem vendedor · incompleto · UF · perfil

## Guia · Comercial

- Lista assigned (obrigatória para `active`)
- Condições N:N (explícitas; AVISTA se só essa marcada)
- **Vendedor padrão** (`default_seller_id`) — obrigatório para `active`

## Guia · Acesso — gates

Transição **somente** `pending → active` **bloqueada** se faltar:

1. `assigned_price_list_id`  
2. Condição **explícita** (linha em `customer_payment_conditions`, inclusive AVISTA se for o caso)  
3. `default_seller_id` com seller `active`  

Mensagem listando faltantes. Suspender continua permitido.  
Clientes **já** `active` sem seller: **não** mass-suspend (antirregress C5).

### Divergência AVISTA

Modelo histórico: N:N vazio = “só À vista” na loja.  
**Gate de ativação:** vazio **não** basta — exige vínculo explícito (mestre §13).

### Multi-path

`assertCustomerCanActivate` (ou RPC) em **todos** os caminhos: `adminSetCustomerStatus`, upsert com `status=active`, aprovação transacional. Nenhum bypass.

## Aprovação a partir de Solicitação

Ver mestre §14 (atômico). Pré-preencher + `leads.customer_id` + gates + `commercial_events`.

## Não-fazer

Vendedor aprovar · crédito real · pedido · confundir condições com limite de crédito · ativar sem gate

## Smoke

C1–C5 antirregress; `access_granted` se active; vendedor na lista.
