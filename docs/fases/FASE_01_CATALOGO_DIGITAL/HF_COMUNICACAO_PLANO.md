# HF — Central de Comunicação (Andar 1)

**Data:** 2026-11-25  
**Escopo:** só HF. Avisos **in-app** de acesso B2B e cotações da cesta. Sem WhatsApp Cloud, OTP, checkout ou FAL.  
**Jornada:** [HF_JORNADA_COMERCIAL_PLANO.md](./HF_JORNADA_COMERCIAL_PLANO.md) · [specs/HF_SPEC_E1_COMUNICACAO.md](./specs/HF_SPEC_E1_COMUNICACAO.md)

## Nome

| Superfície | Label |
|------------|--------|
| Admin | Central de Comunicação (`/admin/comunicacao`) |
| Conta | Avisos (`/conta/avisos`) |
| Código | `app_notifications` |

CTA `wa.me` (`VITE_WHATSAPP_NUMBER`) permanece fora deste módulo.

## Agora / depois

| Agora | Depois |
|-------|--------|
| Kinds `access_*` + `quote_requested` / `quote_sent` | `quote_replied`, `order_*`, `payment_due` |
| Canal `in_app` | WhatsApp Cloud (template UTILITY) |
| Delivery log com `whatsapp=skipped` | Envio Graph API + webhook |
| Lista admin + avisos na conta | Preferências, broadcast, push |

## Kinds ativos

| Kind | Audience | Disparo | Destino href |
|------|----------|---------|--------------|
| `access_pending` | staff | cliente `pending` | `/admin/comunicacao` |
| `access_granted` | customer | staff ativa | `/conta/avisos` |
| `access_suspended` | customer | staff suspende | `/conta/avisos` |
| `quote_requested` | staff | envio cesta `/cotacao` | `/admin/pedidos/cotacoes` (+ `?lead=`) |
| `quote_sent` | customer | envio cesta (logado) | `/conta/avisos` |

### Kinds planejados (jornada — in-app only)

`request_received` · `request_complement` · `access_rejected` · `quote_forwarded` · `quote_closed` — ver spec E1.

## Nota UX

Shell Adaptive `moduleKey=comunicacao` no admin (lista + guia). Conta: lista compacta em `/conta/avisos` + contador no início. Tokens `--hf-*` / `HF_PADRAO_TELAS_UX_OPERACIONAL.md`.

## WhatsApp

**Próximo canal, não este ciclo.** Delivery `whatsapp` fica `skipped` (`provider_ref` null). Sem POST Graph API / Meta templates aqui.

## Smoke

| Cenário | Esperado |
|---------|----------|
| Staff ativa cliente | `access_granted` em `/conta/avisos` |
| Staff suspende | `access_suspended` |
| Novo pending (create) | `access_pending` em `/admin/comunicacao` |
| Envio cotação | `quote_requested` staff → Central de Pedidos; `quote_sent` se logado |
| Marcar lido | some do contador |
| Rede | zero chamada WhatsApp/Graph |
| Vitest | `communicationCopy` kind → título/href |
