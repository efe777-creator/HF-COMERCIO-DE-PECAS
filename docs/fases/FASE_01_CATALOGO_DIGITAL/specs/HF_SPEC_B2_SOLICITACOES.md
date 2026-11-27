# Spec B2 — Central de Pedidos · Solicitações comerciais

**Rota:** `/admin/pedidos/solicitacoes`  
**Deep-link:** `?lead=<id>`  
**Estado:** **Novo** (hoje partner/contact só em `/admin/leads`)  
**Hierarquia:** Adaptive lista → guia → ficha  
**moduleKey:** `pedidos`  
**Fonte:** `leads` `kind` ∈ `partner` \| `contact`  
**Mestre:** [HF_JORNADA_COMERCIAL_PLANO.md](../HF_JORNADA_COMERCIAL_PLANO.md)

## Objetivo

Fila de interessados ainda não aprovados como clientes.

## Atores

Admin · Gerente · Operador comercial (analisa; **não** aprova se RACI restringir — default: só admin/gerente aprova)

## Lista

Colunas: Empresa · CNPJ · Responsável · WhatsApp · Perfil · Interesse · Data · Origem · Situação  

Filtros: novas · em análise · aguardando info (via notas/status) · período · perfil · origem · kind

## Guia contextual

| Bloco | Conteúdo |
|-------|----------|
| Identificação | Empresa, CNPJ, responsável, contatos |
| Interesse | Motivo/perfil/origem/mensagem |
| Histórico | Datas, `staff_notes`, contatos |
| Ações | WA · Observação · Pedir complemento · Encaminhar atendimento · **Aprovar** · **Não aprovar** |

**Aprovar:** processo **transacional** (mestre §14): customer upsert anti-CNPJ-dup · `leads.customer_id` · lista · condições explícitas · vendedor padrão · gate · activate se OK · `commercial_events`. Sem estado active parcial. Não transfere aprovação ao vendedor.  
**Não aprovar (rejeição):** `kind` partner/contact → `status=lost` + `rejected_at` / `rejected_by` / `rejection_reason` (≠ encerramento de cotação `lost`). Aviso `access_rejected` se houver user. Auditoria obrigatória.

## Técnicas

- Sem novo valor em `leads.status`.  
- Aprovação repetida: idempotente (sem segundo customer).  
- Pedir complemento → `request_complement` (fail soft).

## Ficha completa (rota dedicada futura)

Abas: Identificação · Contato · Perfil e interesses · Endereço · Histórico · Análise administrativa  
Até existir rota: guia cobrindo o essencial + “Abrir cadastro” quando customer existir.

## Estados

Loading · Vazio · Erro · Sucesso mutação · Registro indisponível

## Não-fazer

Misturar `kind=quote` nesta fila · vendedor aprovar · Graph API

## Smoke

Lead partner aparece; `?lead=` abre guia; aprovar não ativa sem lista/vendedor; rejeição grava motivo/responsável/data; S1–S4 antirregress.
