# HF Andar 1 — Plano de testes

## Unitários previstos

| Suite | Escopo | Etapa |
|-------|--------|-------|
| vehicleAppYear.test | yearMatches, validate years | E4 |
| compatibilityEngine.test | confirmed/probable/unconfirmed | E5 |
| Import audits existentes | produtos/apps | E8 regressão |

## Smoke F01–F50 (resumo)

| Faixa | Foco |
|-------|------|
| F01–F06 | Identidade/presença/privacidade |
| F07–F14 | Catálogo/admin produto 8 grupos |
| F15–F20 | Veículos/apps hub/years |
| F21–F28 | Busca years + selos + PDP |
| F29–F32 | Campanhas |
| F33–F40 | Cotação/leads/parceiro |
| F41–F45 | Admin/import/kits/dashboard |
| F46–F50 | RLS/build/test/tokens/homolog |

## Gate regressão (E10)

S01–S07 · A01–A04 · D01–D07 · Q01–Q05 (`npm test`, `npm run build`)

## Jornadas E2E

A: visitante → busca → PDP → cotação → admin vê  
B: admin produto → refs → app anos → publish → busca por veículo  
C: campanha ativa home → desativar some  
