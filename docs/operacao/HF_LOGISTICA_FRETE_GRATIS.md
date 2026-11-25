# HF — Logística e frete grátis

**Versão:** 1.1  
**Data:** 2026-11-23  
**Status:** CANÔNICO (premissa comercial + prep APIs)  
**Visão:** [HF_VISAO_2036.md](../entrada/HF_VISAO_2036.md)  
**Integrações:** [HF_INTEGRACOES_E_AGENTES_PREP.md](../arquitetura/HF_INTEGRACOES_E_AGENTES_PREP.md)  
**Andar:** 6 (implantação digital); premissa comercial já vale na operação atual

---

## 1. Diretriz comercial

A HF **assume o custo do frete** e oferece **entrega gratuita ao cliente**.

| Modalidade | Quem paga (cliente) | Quem absorve (empresa) |
|------------|---------------------|-------------------------|
| Motoboy | Grátis | HF |
| **99 Entrega** (API) | Grátis | HF (fee da API = custo interno) |
| **Uber Direct** (API) | Grátis | HF (fee da API = custo interno) |
| Frota própria | Grátis | Custo operacional HF |
| Transportadora | Grátis | HF |

**Regra atual:** frete grátis em **todos** os pedidos (universal).  
**Futuro:** política configurável por região, valor, cliente, modalidade e margem — sem reconstruir o módulo.

---

## 2. Fluxo alvo (Andar 6)

1. Cliente faz o pedido (canal digital ou Sidicom/WA).  
2. Sistema calcula **custo real** (quote 99 e/ou Uber e/ou frota).  
3. Logística escolhe modalidade (regra ops / menor custo / SLA).  
4. Custo (`fee`) registrado e vinculado ao pedido.  
5. Cliente recebe **frete grátis**.  
6. Gestão acompanha gasto com entregas e impacto na margem.

```text
Frete_cliente = 0
Frete_custo_interno = fee_API_ou_custo_frota
Margem_ajustada = margem_bruta - Frete_custo_interno - …
```

---

## 3. Estudo APIs de entrega (2026-11-23)

### 3.1 99 Entrega

- Docs: https://entrega-api.99app.com/doc/  
- Auth: OAuth 2.0 `client_credentials`, escopo `entrega.order`  
- Capacidades: **estimar**, **criar pedido**, **consultar**, **cancelar**  
- Veículos: `entrega_moto` / `entrega_car`  
- `fee` em centavos na estimativa → mapear para custo interno HF  
- `external_order_id` → id do pedido HF/Sidicom  

### 3.2 Uber Direct

- Docs: https://developer.uber.com/docs/deliveries/overview  
- Create Delivery; courier coleta e entrega  
- Fluxo Uber: sandbox → desenvolvimento → **piloto** com lojas → produção  
- BR: solução white-label (pedido no canal da loja; entrega Uber)  
- Merchants: https://merchants.ubereats.com/br/pt-br/services/uber-direct-test/

### 3.3 Prep no CORE (antes do PRD Andar 6 detalhado)

| Item | Ação |
|------|------|
| Adapter `delivery_provider` | `99` \| `uber` \| `fleet` \| `manual` |
| Flags | off até gate |
| Ledger | tabela/campos custo + modality + provider_id |
| Agente logístico | só chama tools após pedido oficial existir |

---

## 4. O que NÃO copiar da referência

- Cotação Melhor Envio **cobrada** do cliente no checkout.  
- Assumir packing ME como única verdade sem custo interno HF.  
- Tratar frete grátis só como texto no app de entrega.

Referência técnica (método): packing, frete próprio, rastreio — com **inversão** da regra comercial. Matriz: `HF_REF_APROVEITAMENTO_DETALHADO.md` §9.

---

## 5. Requisitos mínimos (PRD Andar 6)

| ID | Descrição |
|----|-----------|
| RF-L01 | Cliente não é cobrado frete sob política universal atual |
| RF-L02 | Pedido armazena custo interno e modalidade |
| RF-L03 | Relatório de gasto com entregas |
| RF-L04 | Config futura região/valor/cliente versionável |
| RF-L05 | Integração 99 e/ou Uber (sandbox primeiro) |
| RF-L06 | Fallback manual/frota se API indisponível |

---

## 6. Operação atual (antes do Andar 6 digital)

Registrar custo quando possível; manter promessa frete grátis; despacho 99/Uber pode ser **manual** no app do provedor até a API estar no CORE.
