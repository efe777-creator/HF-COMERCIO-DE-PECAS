# HF — Central de Comunicação (Andar 1)

**Data:** 2026-11-25  
**Escopo:** só HF. Avisos **in-app** ligados à liberação de acesso B2B. Sem WhatsApp Cloud, OTP, pedido ou FAL.

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
| Kinds `access_pending` / `access_granted` / `access_suspended` | `quote_replied`, `order_*`, `payment_due` |
| Canal `in_app` | WhatsApp Cloud (template UTILITY) |
| Delivery log com `whatsapp=skipped` | Envio Graph API + webhook |
| Lista admin + avisos na conta | Preferências, broadcast, push |

## Kinds ativos

| Kind | Audience | Disparo |
|------|----------|---------|
| `access_pending` | staff | cliente `pending` |
| `access_granted` | customer | staff ativa |
| `access_suspended` | customer | staff suspende |

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
| Marcar lido | some do contador |
| Rede | zero chamada WhatsApp/Graph |
| Vitest | `communicationCopy` kind → título/href |
