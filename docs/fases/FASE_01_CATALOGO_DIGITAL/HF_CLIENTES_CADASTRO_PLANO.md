# HF — Clientes B2B: cadastro estruturado (Andar 1)

**Data:** 2026-11-25  
**Escopo:** só HF. Adaptive lista+guia. Sem pedidos, NF-e, crédito liberado, multi-garagem UI, FAL.

## Decisões

| Tema | Agora |
|------|--------|
| Shell | Adaptive `moduleKey=customers` |
| CNPJ | Máscara + dígitos + **BrasilAPI** (sem chave) |
| CEP | **ViaCEP** → endereço editável |
| Região | UF + macrorregião IBGE (derivada); filtro/coluna na lista |
| Fiscal leve | IE + indicador opcionais |
| Contato | `contact_name` + e-mail/fone/WhatsApp |
| Crédito | pill Em breve |
| Endereço | `customer_addresses` kind=`principal` (schema pronto para entrega/operacional) |
| Lista B2B | `customers.assigned_price_list_id` → lista `scope=assigned` (Comercial) |
| Condições | N:N `customer_payment_conditions`; **vazio = só À vista (AVISTA)** |

## Comercial (guia)

- **Lista atribuída** — cliente autenticado vê preço da lista no catálogo/PDP (`priceVisible`); `price_enabled` global continua off para guest.  
- **Condições de pagamento** — multi-select; sem seleção → só AVISTA. CRUD templates em `/admin/financeiro/condicoes`.  
- Persistência no **Salvar** da guia (rascunho HF; não save-on-change FAL).

## Referências

- BrasilAPI CNPJ · ViaCEP · IBGE localidades  
- OdooPME / Nexus — CNPJ → preenche → humano confere IE/endereço  
- Não persistir QSA (CPF parcial)  
- Migrations: `migrations_hf/30_*` addresses · `31_customer_payment_conditions` · `32_assigned_price_list_b2b` (espelho dated `20261124120000` / `20261125010000`)  
- Relacionados: [HF_FINANCEIRO_BASE_PLANO.md](./HF_FINANCEIRO_BASE_PLANO.md) · [HF_LISTAS_PRECO_RELACOES_SMOKE.md](./HF_LISTAS_PRECO_RELACOES_SMOKE.md)

## Pills da guia

Identidade · Contato · Endereço · Comercial · Acesso · Crédito (placeholder)

## Smoke (2026-11-24/25 — validação completa)

| # | Critério | Resultado |
|---|----------|-----------|
| 1 | Adaptive `/admin/clientes` + pills + Abrir/Na guia | **PASS** (UI) |
| 2 | Vitest CNPJ + UF→região | **PASS** (4) |
| 3 | Suite vitest completa | **PASS** (188) |
| 4 | BrasilAPI + ViaCEP live HTTP | **PASS** |
| 5 | Migration cols + indexes + RLS addresses | **PASS** |
| 6 | Unique CNPJ (dígitos) bloqueia duplicata | **PASS** (SQL) |
| 7 | UI Buscar→Aplicar→Salvar + endereço principal | **PASS** (OKB SP/Sudeste) |
| 8 | Snapshot `cnpj_status`/`cnae` persiste após fix fallback | **PASS** |
| 9 | Layout vs padrão Adaptive (Kits/Finanças) | **PASS** (soft: status EN, sem toast) |
| 10 | Comercial: lista assigned + condições N:N / AVISTA fallback | **PENDENTE** smoke B2B login |
| 11 | Vitest eligibility `[]`→AVISTA + filter por IDs | **PASS** |

## Fora

API CNPJ paga, CNPJ alfanumérico, territórios HF, limite de crédito, parent_id matriz/filial.
