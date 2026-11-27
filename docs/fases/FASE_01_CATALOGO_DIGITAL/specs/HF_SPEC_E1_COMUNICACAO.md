# Spec E1 — Central de Comunicação (jornada)

**Rota:** `/admin/comunicacao`  
**Estado:** Vivo Adaptive — estender kinds  
**moduleKey:** `comunicacao`  
**Mestre:** [HF_JORNADA_COMERCIAL_PLANO.md](../HF_JORNADA_COMERCIAL_PLANO.md) · [HF_COMUNICACAO_PLANO.md](../HF_COMUNICACAO_PLANO.md)

## Objetivo

Registrar eventos in-app da jornada. Canal `whatsapp` permanece `skipped` neste ciclo.

## Kinds — agora (vivos)

| Kind | Audience | Href típico |
|------|----------|-------------|
| `access_pending` | staff | `/admin/clientes` |
| `access_granted` | customer | `/conta` / avisos |
| `access_suspended` | customer | `/conta` |
| `quote_requested` | staff | `/admin/pedidos/cotacoes?lead=` |
| `quote_sent` | customer | `/conta/avisos` |

## Kinds — Andar 1 a acrescentar (in-app)

| Kind | Audience | Momento | Href típico | Copy PT-BR |
|------|----------|---------|-------------|------------|
| `request_received` | staff | Cadastro inicial / partner | `/admin/pedidos/solicitacoes?lead=` | **Pendência** §21 mestre |
| `request_complement` | customer | Staff pediu complemento | `/conta` ou formulário | Pendência |
| `access_rejected` | customer | Rejeição solicitação | `/conta/avisos` | Pendência |
| `quote_forwarded` | staff | Destinatário registrado | `/admin/pedidos/cotacoes?lead=` | Pendência |
| `quote_closed` | staff | Encerramento com motivo | `/admin/pedidos/cotacoes?lead=` | Pendência |

Kinds vivos preservados: `access_*`, `quote_requested`, `quote_sent`.

## Idempotência e falha

- Dedupe por `source_event_id` ou chave `(kind, entity_id, action)` em retry.  
- Fail soft: operação comercial já persistida não reverte.  
- Delivery WhatsApp: `skipped` (sem Graph).

## Lista / guia

Manter padrão atual: data, destinatário, tipo, canal, entrega, leitura; guia com corpo + registro relacionado.

## Não-fazer

Graph API · templates Meta · e-mail transacional neste ciclo · duplicar notify em retry

## Smoke

K1–K4 antirregress; Vitest copy→href para kinds novos e antigos.
