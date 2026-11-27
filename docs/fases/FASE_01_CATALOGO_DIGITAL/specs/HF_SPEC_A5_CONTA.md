# Spec A5 — Conta do cliente

**Rotas:** `/conta`, `/conta/perfil`, `/conta/veiculos`, `/conta/avisos`  
**Estado:** Vivo — evoluir leitura comercial  
**Mestre:** [HF_JORNADA_COMERCIAL_PLANO.md](../HF_JORNADA_COMERCIAL_PLANO.md)

## Objetivo

Visão do cliente autenticado: perfil, veículos, avisos; leitura de dados comerciais autorizados.

## Dados comerciais (leitura)

Quando houver `customer` vinculado:

- Situação (`pending` / `active` / …)
- Lista de preços (nome da assigned, sem editar)
- Condições liberadas
- **Vendedor padrão** (nome + WhatsApp) — após entidade `sellers`

## Avisos

`/conta/avisos` — kinds customer (`access_*`, `quote_sent`, futuros `access_rejected`, etc.).

## Não-fazer

Cliente alterar lista/vendedor padrão · aprovar a si mesmo · crédito

## Smoke

Active vê lista/condições/vendedor; pending não vê preço no catálogo; marcar aviso lido.
