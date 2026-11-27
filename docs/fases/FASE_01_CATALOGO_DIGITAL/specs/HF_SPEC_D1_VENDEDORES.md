# Spec D1 — Vendedores

**Rota:** `/admin/vendedores`  
**Estado:** **Novo**  
**Hierarquia:** Adaptive lista → guia → ficha  
**moduleKey:** `vendedores`  
**Entidade:** `sellers`  
**Mestre:** [HF_JORNADA_COMERCIAL_PLANO.md](../HF_JORNADA_COMERCIAL_PLANO.md)

## Objetivo

Cadastro comercial de vendedores (WhatsApp + carteira). Distinto de `/admin/operadores`.

## Atores

Admin · Gerente (CRUD). Vendedor **não** gerencia a própria entidade neste ciclo (salvo leitura futura).

## Lista

Nome · WhatsApp comercial · E-mail · Situação · Nº clientes · Data  

Filtros: ativos · inativos · nome

## Guia

Identificação · Contato (WA, telefone, e-mail) · Clientes vinculados (contagem + atalhos) · Ativar / Inativar

## Ficha (abas)

1. Identificação — nome, código interno opcional, status  
2. Contato — WA comercial*, e-mail, telefone  
3. Acesso — `profile_id` opcional (se tiver login staff; permissões **não** incluem aprovar cliente)  
4. Clientes — lista com `default_seller_id` = este; alterar padrão exige permissão (vai ao cadastro do cliente)

## Regras

- **Soft-delete:** inativar (`status=inactive`); sem DELETE físico se há `customers.default_seller_id` ou leads com `recipient_seller_id` (RESTRICT / bloqueio app).  
- Inativar com clientes: **exigir realocação** do vendedor padrão antes.  
- Cotação antiga pode manter FK de destinatário inativo — UI aviso.  
- Picker loja: **somente** view/RPC pública (`id`, `name`, `whatsapp`) — mestre §12.5.  
- CRUD: admin/gerente; ≠ `/admin/operadores`.

## Não-fazer

Fundir com Operadores · dar poder de aprovação · WhatsApp Cloud · expor e-mail/`profile_id` no picker público

## Smoke

Criar ativo; atribuir em Cliente; picker cotação; inativar com realocação; T3–T5 antirregress.
