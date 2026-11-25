# fonte — Inteligência e integrações × o que a HF precisa estruturar

**Data:** 2026-11-23  
**Status:** CANÔNICO (evidência)  
**Fontes fonte:** Arquitetura 360 §7, edges em `fonte-pecas/supabase/functions`, `.env.example`, PRD 4.0  
**Premissa HF:** Sidicom + frete grátis + WA; API Sidicom = **a investigar** (não inventar)

---

## 1. Integrações fonte existentes

| Integração | Mecanismo | Degradação fonte | Ação típica HF |
|------------|-----------|----------------|----------------|
| Supabase Auth/DB/Storage | Nativo | — | **REUSAR** padrão (projeto HF próprio) |
| Mercado Pago | Edges + webhooks | Sync / não duplicar | **NAO_TRAZER** no curto prazo (Sidicom) |
| Asaas | Edges + webhooks | Idem | **NAO_TRAZER** curto prazo |
| Melhor Envio | quote/label/webhook/reverse | Mensagem; own se houver | **ADAPTAR** só como aprendizado; HF frete grátis |
| Frete próprio (POL) | `quote-own-delivery` | — | **ADAPTAR** (custo interno) |
| Placa | `plate-lookup` + providers | Seletor manual | **ADAPTAR** Andar 1+ se priorizado |
| Busca NL / Groq | `interpret-search-nl` | Heurística / q textual | **ADAPTAR** opcional |
| WhatsApp OTP | `send/verify-auth-otp` (Z-API) | — | **ADAPTAR** se auth WA for requisito |
| WhatsApp CTA | Link / número display | — | HF já tem via env |

---

## 2. Inteligência fonte de referência (parcial)

| Capacidade | Estado fonte | Nota para HF |
|------------|------------|--------------|
| INV (identidade veículo aditiva) | Parcial / forte em docs | Método útil; não copiar Garage rica |
| NL search | Edge opcional | Acelerador de busca Andar 1/8 |
| Roteamento pay | Config DB | Irrelevante enquanto Sidicom paga/recebe |
| Notificações inbox | Parcial | Futuro atendimento |
| Agentes IA commerce | Futuro (`docs/futuro`) | Bloco/Andar IA HF — **CONSTRUIR** próprio |

---

## 3. O que a HF precisa estruturar (integrações)

| Integração | Status conhecimento | Próximo passo |
|------------|---------------------|---------------|
| **Sidicom** | Operacional na empresa; API/capacidades **não verificadas** | Questionário fornecedor (ver `HF_SIDICOM_E_TRANSICAO.md`) |
| WhatsApp Business / Z-API | Só CTA número | Definir se OTP/inbox entram em qual andar |
| 99 / Uber / motoboy | Ops hoje (frete grátis) | Módulo logística: registrar custo interno |
| Transportadoras | Ops | Idem |
| Fiscal / NF | Sidicom | Não portar “fiscal fonte” se existir parcial |
| Hospedagem | HF: Hostinger static | Manter; não misturar Netlify fonte |

**Regra:** não presumir API Sidicom (consulta estoque, preço, pedido, cliente, limite). Documentar “TBD fornecedor”.

---

## 4. Contratos que a HF deve ter no CORE (inspirados na fonte de referência)

Mesmo com Sidicom, o CORE precisa de **um contrato por capacidade** quando digitalizar:

| Capacidade | Contrato alvo HF | Integra Sidicom? |
|------------|------------------|------------------|
| Busca catálogo | `search_products` (já) | Não |
| Resolução preço | `resolve_product_price` | Sync/espelho TBD |
| Criar pedido digital | `place_order` HF | Sim (até corte) |
| Cotação frete interno | `quote_delivery_cost` | Não (cliente grátis) |
| Disponibilidade estoque | `get_stock` | Sim (enquanto Sidicom SoT) |

---

## 5. Checklist de validação por integração

### Antes de portar qualquer Edge fonte

- [ ] Projeto/secrets **HF**, nunca fonte de referência  
- [ ] Domínio tem SoT acordado (CORE vs Sidicom)  
- [ ] Degradação definida se API cair  
- [ ] Idempotência (pay/pedido)  
- [ ] Feature flag + aceite do andar  

### Antes de integrar Sidicom

- [ ] Respostas do fornecedor (API / DB / arquivo / nenhum)  
- [ ] Mapa campo a campo (SKU, cliente, estoque, pedido)  
- [ ] Estratégia anti-duplicidade  
- [ ] Ambiente de homologação  

### Frete / apps de entrega

- [ ] Pedido registra custo real da modalidade  
- [ ] Cliente vê frete R$ 0 (ou “grátis”)  
- [ ] Relatório de gasto com entregas  
- [ ] Política futura configurável (região/valor) sem reescrever módulo  

---

## 6. Ordem sugerida de integrações (HF)

1. Catálogo + WA (já)  
2. Investigação Sidicom (docs/ops)  
3. Sync leitura (estoque/preço) se API existir — Andar 2–3  
4. Pedido digital → Sidicom — Andar 2  
5. Logística custo interno + 99/Uber — Andar 6  
6. IA agentes / NL — Andar 8  
7. Corte Sidicom — após paralelo confiável  
