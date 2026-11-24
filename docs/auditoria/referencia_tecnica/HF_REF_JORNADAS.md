# fonte — Jornadas cliente e operador × contraste HF

**Data:** 2026-11-23  
**Status:** CANÔNICO (evidência)  
**Fonte fonte:** `FAL_PRD_4.0.md` §7, `FAL_AUDITORIA_CONSOLIDADA_PRD4.md` §5, mapa telas MVP  
**HF:** catálogo B2B + WhatsApp; Sidicom = pedidos/NF/estoque oficiais hoje

---

## 1. Jornadas cliente fonte (A–H)

| ID | Jornada | Objetivo fonte | Fluidez (auditoria PRD4) | Rotas / contratos-chave |
|----|---------|--------------|--------------------------|-------------------------|
| A | Descoberta | Achar peça com veículo/contexto | **FLUI** | `/`, `/catalogo`, `/produto`, `/veiculo`, NL, placa |
| B | Compra | Checkout confiável | **REMENDA** | `/carrinho`, `/checkout` |
| C | Pagamento | Cobrança correta sem duplicar | **REMENDA** | Edges MP/Asaas, webhooks |
| D | Processamento | Análise / separação | **FLUI** | Admin pedidos + RPCs |
| E | Entrega | Despacho + rastreio | **REMENDA** | ME label, own delivery |
| F | Pós-venda | Cancel/confirm; RMA mínimo | **TRAVA** (RMA) | Legais + cancel parcial |
| G | Admin | Operar catálogo/estoque/pedidos/pay/frete | **FLUI** | `/admin/*` |
| H | Atendimento | Inbox + resposta | **REMENDA** | Notificações; WA futuro |

Papéis fonte loja: **B2C cliente** + staff. Roles staff: `administrador|gerente|operador|estoque|atendimento`.

---

## 2. Jornada operador fonte (admin — fluxo típico)

```text
Login staff
  → Dashboard
  → Catálogo (CRUD / import / apps / preços)
  → Pedidos (hub → análise → separação → expedição)
  → Estoque / movimentos
  → Logística (origem, caixas, ME, frete próprio)
  → Pagamentos (provedores, webhooks)
  → Clientes / avisos / relatórios / operadores
```

Pontos fortes: hub de pedidos, superfície ampla, RPCs de transição.  
Pontos fracos (fonte): pay/frete remendados; pós-venda RMA fraco; docs vs código drift.

---

## 3. Jornada cliente HF (hoje vs alvo)

### Hoje (Fase 1 / MVP runtime)

```text
Visitante (published aberto) ou login B2B
  → Home / catálogo / busca / categoria / marca / veículo
  → PDP → CONSULTAR ESTA PEÇA (WhatsApp)
  → Conta (perfil, veículos) se autenticado
  → Pedido oficial: FORA do app → equipe + Sidicom
```

| Etapa fonte de referência | Equivalente HF hoje | Diferença |
|-----------|---------------------|-----------|
| A Descoberta | Sim (sem placa/NL) | Sem preço na vitrine |
| B Compra | Cotação WA | Sem carrinho/checkout |
| C Pagamento | Sidicom / processo interno | Sem MP/Asaas no app |
| D–E Ops/entrega | Sidicom + operação física + frete grátis | Sem módulo logística no app |
| F Pós-venda | Humano | Sem RMA digital |
| G Admin | Catálogo/import/B2B/preços staff | Sem pedidos/estoque/pay admin |
| H Atendimento | WhatsApp CTA | Sem inbox/OTP |

### Alvo (CORE, pós-coexistência)

Canais: WhatsApp · Portal B2B · App · Painel · E-commerce.  
Pedido digital no CORE; **Sidicom** até corte; frete **grátis ao cliente**, custo interno rastreável.

---

## 4. Jornada operador HF (hoje)

```text
Staff login
  → /admin dashboard
  → Produtos / taxonomia / veículos / fabricantes
  → Import hub (produtos, apps, HF bundle, conversões, custos)
  → Fornecedores
  → Preços (staff)
  → Listas B2B / clientes / grupos
  → Operadores
  → Pedido/NF/estoque: Sidicom (fora do app)
```

---

## 5. Implicações para reuso

| Não copiar da fonte de referência para a HF | Por quê |
|-----------------------------|---------|
| Funil B2C checkout + MP como “padrão” | HF = B2B distribuidora + Sidicom + frete grátis |
| Frete cobrado do cliente (ME cotação checkout) | Política HF: cliente não paga frete |
| Garage rica / Parceiros / Workshop | Fora da essência HF imediata |

| Aproveitar padrão de jornada | Como |
|------------------------------|------|
| Descoberta (catálogo + veículo + busca) | Andar 1 — já forte na HF |
| Admin catálogo/import | Andar 1 — já forte |
| Contratos únicos (`place_order`, resolve preço) | Andares 2–6 quando CORE assumir |
| Separação status ≠ estoque ≠ preço | Já na HF |
| Gates MARCHA/VAL | Método documental |

---

## 6. Checklist de validação ao portar jornadas comerciais

Antes de ligar carrinho/pedido/frete/pay na HF:

- [ ] Sidicom continua SoT oficial do domínio?  
- [ ] Fluxo gera **duplicidade** de pedido?  
- [ ] Frete grátis + custo interno modelados?  
- [ ] Cliente B2B (CNPJ/grupo/lista) vs B2C fonte?  
- [ ] Identidade visual HF (não tokens de terceiros)?  
- [ ] Feature flags e aceite por andar?
