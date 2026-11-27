# Spec A6 — Cotação (cesta)

**Rota:** `/cotacao`  
**Estado:** Vivo multi-item — evoluir gate + vendedor  
**Sub-telas (sem rota):** Dados pendentes · Escolha de vendedor  
**Mestre:** [HF_JORNADA_COMERCIAL_PLANO.md](../HF_JORNADA_COMERCIAL_PLANO.md) · [HF_COTACAO_CESTA_PLANO.md](../HF_COTACAO_CESTA_PLANO.md)

## Objetivo

Revisar cesta (`hf-quote-basket-v1`), completar dados se preciso, escolher destinatário (se active), registrar lead quote e abrir `wa.me`.

## Atores

Guest · Cliente pending/suspended · Cliente `active`

## Fluxo

```text
1. Revisar itens / qtd / preço se active
2. Se active: gate complementação (contato + endereço mínimo)
3. Se active: escolha vendedor (padrão pré-selecionado | outro)
4. createLead(quote) + items + customer_id + recipient_seller_id
5. Abrir WA: destinatário (active) | loja (guest/não-active)
6. Avisos quote_requested (+ quote_sent / quote_forwarded)
```

## Gate complementação

Campos mínimos se faltarem: responsável, WhatsApp, e-mail, endereço principal (CEP + cidade/UF).  
Formulário curto; não abrir ficha admin completa.

## Escolha de vendedor

- Mostra **vendedor padrão** (nome + WA via **view/RPC pública** — sem e-mail/`profile_id`).  
- Opção trocar → sellers `active` apenas.  
- Seller **inativo** fora do picker; se padrão inativo → fallback WA loja + aviso.  
- Troca grava só `recipient_seller_id`; **não** altera `customers.default_seller_id`.

## Guest / não-active

Sem picker. Romaneio → `VITE_WHATSAPP_NUMBER`. Preço oculto.

## Técnicas (mestre §17 · §19)

- `forwarded_at` = intenção de contato; **não** = entrega WhatsApp.  
- Persistência do lead **antes** de abrir `wa.me`; falha de notify **não** apaga cotação.  
- Emit `quote_requested` / `quote_sent` / `quote_forwarded` com idempotência.

## Estados

Cesta vazia · Loading preços · Validação · Erro real Supabase · Sucesso + protocolo · Nova cotação reseta `doneId`

## Não-fazer

Checkout · Graph API · confundir com pedido · alterar vendedor padrão nesta tela · tratar wa.me como delivery

## Smoke

Guest → WA loja; active completo → WA vendedor; active incompleto → modal; troca destinatário não muda cadastro; N itens; Q1–Q3 antirregress.
