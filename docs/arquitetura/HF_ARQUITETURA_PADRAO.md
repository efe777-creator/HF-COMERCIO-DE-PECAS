# HF — Padrão de arquitetura

**Versão:** 1.0  
**Data:** 2026-11-23  
**Status:** CANÔNICO  
**Detalhe histórico de stack:** [ARQUITETURA_HF.md](../ARQUITETURA_HF.md)  
**SoT de dados:** [HF_DADOS_FONTES_VERDADE.md](./HF_DADOS_FONTES_VERDADE.md)  
**Runtime auditado:** [HF_INVENTARIO_CODIGO_RUNTIME.md](../auditoria/HF_INVENTARIO_CODIGO_RUNTIME.md)

Este arquivo **substitui** a autoridade dos stubs antigos `docs/architecture.md` (que apontavam para `entrada/ARCHITECTURE.md` inexistente).

---

## 1. Princípios

1. **HF é independente** — projeto Supabase, env, branding e regras próprios.  
2. **Camadas:** UI não chama `supabase.from` direto; passa por `services`.  
3. **Flags:** capacidades comerciais só via `src/config/features.ts`.  
4. **Separação de conceitos:** status de catálogo ≠ preço ≠ estoque ≠ pedido.  
5. **CORE evolutivo:** o MVP é SPA + Supabase; o mapa enterprise (Bloco 06) cresce depois da org (Blocos 03–05).

---

## 2. Stack atual (MVP)

React 19 + TypeScript + Vite + React Router 7 + Tailwind 4 + Supabase (Auth, Postgres, Storage, RLS).

```text
Browser
  → pages / components
  → hooks / contexts (Auth)
  → services
  → lib/supabase.ts (anon)
  → Supabase HF (owllmfcpbodqmoerdfxx, sa-east-1)
```

---

## 3. Domínios do sistema (mapa CORE — v0)

| Domínio | Estado MVP | Notas |
|---------|------------|-------|
| Identidade / auth | Vivo | Profiles + staff roles |
| Catálogo | Vivo | Products, taxonomy, images, refs |
| Aplicações veículo | Vivo | Compat + import |
| B2B acesso | Parcial | Schema + admin; vitrine pública se flag false |
| Importação | Vivo | Pipeline + RPCs |
| Pricing | Preparado staff | Flag `price_enabled` off na vitrine |
| Estoque / pedidos / frete / pagamento | Off | Não no runtime; legado externo não aplicar |
| WhatsApp | Vivo | Env `VITE_WHATSAPP_NUMBER` |
| IA / agentes | Futuro | Bloco 13 |

---

## 4. Feature flags (política)

- Fonte única: `src/config/features.ts`.  
- Não espalhar booleanos de produto.  
- Fases PRD 8–12 só ligam com aceite + doc operacional.  
- Inventário atual: ver auditoria de código.

---

## 5. Migrations

- **SoT SQL:** `supabase/migrations_hf/`  
- **Legado:** `supabase/migrations/` — não aplicar no projeto HF  
- Fresh DB: um caminho (cadeia numerada **ou** foundation blob) — ver SoT

---

## 6. Deploy

Runbook: `docs/DEPLOY_HOSTINGER.md` (índice em `operacao/HF_RUNBOOKS.md`).  
Branches: `plan` → `dev` → `main`; artefato `hostinger-static`.

---

## 7. Evolução para HF CORE (próximos docs)

Quando Blocos 03–05 estiverem claros, expandir este padrão com:

- diagrama de contextos (catálogo, comercial, CD, financeiro, canais);  
- contratos de integração (ERP externo vs nativo);  
- política de Edge Functions e secrets.
