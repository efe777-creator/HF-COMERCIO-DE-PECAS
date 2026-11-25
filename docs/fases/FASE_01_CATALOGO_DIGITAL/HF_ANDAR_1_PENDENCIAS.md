# HF Andar 1 — Pendências P2/P3

| ID | Sev | Descrição | Etapa | Status |
|----|-----|-----------|-------|--------|
| P-H1 | P2 | Assinatura humana Homologação 1.1 (dono/produto/ops) | E11 | ABERTO |
| P-H2 | P2 | Deploy Hostinger do build pós-marcha (`/privacidade` `/cotacao` `/seja-parceiro`) | E11 | ABERTO |
| P-H3 | P3 | Re-smoke produção após deploy (L01–L10 espelhados) | E10 | ABERTO |
| P-H4 | P3 | UI rica de edição inline de PVC no hub (hoje lista + link produto) | E4 | ABERTO |
| P-H5 | P3 | Massa refs (RF-005) expansão contínua ops | ops | ABERTO |
| P-H6 | P2 | Sync fonte→HF apply (`scripts/sync-catalog-source-to-hf.mjs`) — aguarda service roles em `.env.sync.local` | dados | ABERTO |
| P-H7 | P3 | Popular `product_images` (sync storage ou `/admin/produtos/importar-imagens`) | M03/M07 | ABERTO |

## Fechado nesta marcha (código)

- Vitrine/PDP leem `product_images` (placeholder sem emoji se vazio).  
- Import imagens por código no hub admin.  
- Script sync + `HF_SYNC_CATALOGO_FONTE.md`.
