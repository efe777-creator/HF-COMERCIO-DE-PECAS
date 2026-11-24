# D5 — Questionário Sidicom (pacote para envio)

**Data do pacote:** 2026-11-24  
**Status:** PRONTO · **OPCIONAL / ADIADO** — **não** bloqueia Gate 01 nem PRD Andar 2 (decisão 2026-11-24)  
**RF-034:** opcional  
**Fonte canônica:** [HF_SIDICOM_E_TRANSICAO.md](../../operacao/HF_SIDICOM_E_TRANSICAO.md) §5  
**Projeto:** HF Comércio de Peças — integrar Sidicom **só quando** houver intenção de sync  

---

## Como usar (quando decidir integrar)

1. Copiar o bloco **Mensagem + perguntas** abaixo.  
2. Enviar ao contato técnico/comercial Sidicom (e-mail ou canal oficial do contrato HF).  
3. Registrar data/hora do envio e destinatário neste arquivo (§Registro).  
4. Quando as respostas chegarem: atualizar `HF_SIDICOM_E_TRANSICAO.md` + PRDs afetados.

**Este arquivo não substitui o envio.** Só deixa o conteúdo pronto. Pedido digital oficial = **HF Andar 2**, independente deste questionário.

---

## Mensagem sugerida

```text
Assunto: HF Comércio de Peças — questionário de integração (API / e-commerce / export)

Prezados,

Somos a HF Comércio de Peças (Guarulhos/SP). Estamos construindo canais digitais
próprios (catálogo B2B) que precisam coexistir com o Sidicom, nosso ERP oficial
hoje para clientes, estoque, pedidos, condições e NF.

Pedimos o preenchimento do questionário abaixo para planejar integração segura
(sem duplicar escritura de estoque/pedido).

Agradecemos retorno com o máximo de detalhe técnico disponível (docs, ambientes
de teste, limites e módulos contratados).

Atenciosamente,
HF Comércio de Peças
```

---

## Perguntas (enviar integralmente)

| # | Pergunta | Resposta (preencher Sidicom / HF) |
|---|----------|-----------------------------------|
| 1 | Existe API documentada do ERP (REST/SOAP/outro)? Quais módulos? | |
| 2 | É possível consulta externa de estoque e preços? | |
| 3 | É possível inclusão/atualização de pedidos por integração? | |
| 4 | É possível consulta de clientes, condições de pagamento e limites de crédito? | |
| 5 | Qual mecanismo disponível: API, banco, arquivo, middleware, painel e-commerce Sidicom? | |
| 6 | A HF já tem módulo e-commerce/marketplace Sidicom ativo? Quais plataformas? | |
| 7 | Há homologação, rate limit, autenticação e ambiente de teste? | |
| 8 | Quem é dono do SKU canônico na sincronização (Sidicom vs canal digital)? | |
| 9 | Há webhooks ou só polling para status de pedido/estoque? | |
| 10 | Integração com agentes/terceiros (ex.: automações) é permitida contratualmente? | |

---

## Contexto técnico HF (anexo opcional)

- Canal digital: React + Vite + Supabase (projeto próprio HF).  
- Catálogo digital = SoT de produto/fitment no app.  
- Pedido digital oficial = **HF Andar 2** (sem sync Sidicom obrigatório neste momento).  
- Estoque/NF: convivência com Sidicom/manual até decisão D7.  
- Frete ao cliente = grátis (custo interno HF).  
- Não solicitamos desligar o Sidicom; queremos mapa de coexistência **quando** for integrar.

---

## Registro de envio (preencher após enviar)

| Campo | Valor |
|-------|-------|
| Data/hora envio | |
| Canal (e-mail / portal / WhatsApp) | |
| Destinatário | |
| Remetente HF | |
| Protocolo / ticket | |
| Respostas recebidas em | |

**RF-034:** opcional — marcar **OK (enviado)** só se/quando este registro for preenchido. Gate 01 **não** depende disso.
