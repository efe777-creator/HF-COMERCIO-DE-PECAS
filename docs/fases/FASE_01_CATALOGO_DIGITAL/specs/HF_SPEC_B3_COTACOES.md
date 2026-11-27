# Spec B3 — Central de Pedidos · Cotações

**Rota:** `/admin/pedidos/cotacoes`  
**Deep-link:** `?lead=<id>`  
**Estado:** Vivo Adaptive — evoluir colunas, destinatário, encerrar  
**moduleKey:** `pedidos`  
**Fonte:** `leads` `kind=quote` + `lead_items`  
**Mestre:** [HF_JORNADA_COMERCIAL_PLANO.md](../HF_JORNADA_COMERCIAL_PLANO.md) · [HF_COTACAO_CESTA_PLANO.md](../HF_COTACAO_CESTA_PLANO.md)

## Objetivo

Fila operacional de cotações; acompanhamento e **encerramento manual**.

## Lista (alvo)

Protocolo · Empresa · CNPJ · Data · Qtd itens · Vendedor padrão · Destinatário · Situação · Atualização  

Filtros: período · cliente · vendedor · situação · só novas

## Guia

| Bloco | Conteúdo |
|-------|----------|
| Cliente | Empresa, CNPJ, responsável, WA, e-mail, endereço (se customer) |
| Encaminhamento | Padrão · Destinatário · WA destino · data |
| Itens | SKU, nome, qtd, preço se aplicável |
| Histórico | Notas, status, resultado |
| Ações | Abrir cliente · WA destinatário · Registrar retorno · **Encerrar** |

## Encerrar cotação

Obrigatório: resultado (`won` / `lost`) · **motivo** (`close_reason`) · `closed_at` · actor (auditoria).  
Emite `quote_closed` (staff); fail soft. Não cria pedido.  
**Bloquear** select genérico de status que sete `won`/`lost` sem o fluxo Encerrar (`closeQuote` / validação em service).  
Segundo encerrar com `closed_at` já preenchido → bloqueado.  
Reabertura: só conforme pendência mestre §21.

## Encaminhamento

`recipient_seller_id` + `forwarded_at` = intenção; WA≠entrega. Cotação permanece na lista se usuário não enviar no app.

## Status

`new` · `in_progress` · `won` · `lost` · `spam` (existente — sem novos valores)

## Não-fazer

Checkout · promover a pedido Andar 2 · Graph API · confundir `lost` cotação com rejeição de solicitação

## Smoke

Itens N linhas; `?lead=` abre guia; encerrar exige motivo; destinatário visível; Q4–Q5 antirregress.
