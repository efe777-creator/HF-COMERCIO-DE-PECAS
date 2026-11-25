# HF Andar 1 — Homologação 1.1

**Além do Gate 01.** Diagnóstico: [HF_ANDAR_1_DIAGNOSTICO.md](./HF_ANDAR_1_DIAGNOSTICO.md)  
**Relatório:** [HF_ANDAR_1_RELATORIO_VALIDACAO.md](./HF_ANDAR_1_RELATORIO_VALIDACAO.md)  
**Data técnica:** 2026-11-24

## Critérios de aceite

| # | Critério | PASS/FAIL |
|---|----------|-----------|
| H01 | Páginas públicas funcionais | PASS |
| H02 | Catálogo com dados reais / sem preço público | PASS |
| H03 | Cadastros admin persistem | PASS |
| H04 | Inteligência veicular + apps com período | PASS |
| H05 | Relacionamentos PVC íntegros | PASS |
| H06 | Busca consistente (incl. faixa PVC) | PASS (SQL 16) |
| H07 | PDP completa (galeria `product_images` + placeholder) | PASS |
| H08 | Campanhas administráveis | PASS |
| H09 | Cotações registradas | PASS |
| H10 | Leads/parceiros administráveis | PASS |
| H11 | Importações testadas | PASS (hub + histórico + imagens por SKU) |
| H12 | Permissões + RLS | PASS |
| H13 | Responsivo básico | PASS (layout existente) |
| H14 | Testes auto + manuais documentados | PASS (85 tests + relatório) |
| H15 | Zero P0/P1 abertos | PASS técnico |
| H16 | Regressão Gate | PASS auto (smoke manual recomendado) |
| H17 | Deploy homologação | PENDENTE ops |

## Assinaturas

| Papel | Nome | Data | Assinatura |
|-------|------|------|------------|
| Produto | | | |
| Operação | | | |
| Dono | | | |

**Nota:** aceite técnico de engenharia concluído; assinatura do dono permanece humana.
