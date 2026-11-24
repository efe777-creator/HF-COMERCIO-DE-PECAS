# fonte — Estrutura e módulos (inventário para reuso HF)

**Data:** 2026-11-23  
**Status:** CANÔNICO (evidência)  
**Restrição:** projeto de terceiros = **somente leitura**. Este arquivo vive só no repo HF.  
**Base fonte:** `D:\Programas WEB\PROGRAMAS WEB PENDRIVE\fonte PECAS AUTOMOTIVAS`  
**Contraste HF:** `docs/auditoria/HF_INVENTARIO_CODIGO_RUNTIME.md`

---

## 1. Árvore de alto nível (fonte)

```text
fonte PECAS AUTOMOTIVAS/
├── docs/                    # autoridade documental (~866 md)
│   ├── entrada/             # índice, PRD 4.0, visão 2040, DATABASE, UX…
│   ├── arquitetura/         # 360°, SoT dados, mapa veículo
│   ├── planejamento/        # ~798 (MARCHA/VAL/auditorias/planos)
│   ├── dados/               # qualidade mestre veicular
│   ├── futuro/              # Garage/Parceiros/Workshop (não implementar)
│   └── superpowers/         # specs/planos de sessão
├── fonte-pecas/               # app React 19 + Vite + Supabase
│   ├── src/                 # app, pages, services, components…
│   └── supabase/            # ~210 migrations + 19 edge functions
├── LOGOTIPO/, TIPOGRAFIA/   # identidade fonte (NÃO trazer para HF)
```

Navegação canônica fonte de referência: `docs/entrada/FAL_INDICE_CANONICO.md`.

---

## 2. Documentação canônica fonte de referência (o que ler)

| Documento | Papel para HF |
|-----------|---------------|
| `FAL_PRD_4.0.md` | Domínios, jornadas A–H, regras commerce — **referência**, não copiar regras |
| `FAL_AUDITORIA_CONSOLIDADA_PRD4.md` | Inventário telas/SoT/gaps — método de auditoria |
| `FAL_ARQUITETURA_360.md` | Modular monolith + contratos RPC |
| `FAL_DADOS_FONTES_VERDADE.md` | Hierarquia SoT por domínio |
| `FAL_MAPA_VEICULO_*` | Identidade vs INV vs PVC |
| `DATABASE.md` | Diagrama entidades (header ainda cita PRD 3.0) |
| MARCHA/VAL em `planejamento/` | Evidência tática — só quando precisar de um domínio |

---

## 3. App `fonte-pecas/src/`

| Pasta | Conteúdo |
|-------|----------|
| `app/` | `router.tsx`, guards (`StaffRoute`, `ProtectedRoute`) |
| `pages/` | Loja + Admin |
| `components/` | UI compartilhada |
| `services/` | **25** domínios de serviço |
| `hooks/`, `contexts/`, `lib/`, `types/`, `styles/`, `assets/`, `data/` | suporte |

### Services (25)

`address`, `admin`, `brands`, `cart`, `categories`, `checkout`, `compatibility`, `customers`, `fase81`, `fiscal`, `garage`, `home`, `import`, `notifications`, `orders`, `payments`, `plates`, `pricing`, `products`, `search`, `shipping`, `store`, `supabase`, `support`, `vehicles`

### Rotas (síntese ~70)

**Loja:** `/`, `/catalogo`, `/produto/:slugOrId`, `/veiculo`, `/carrinho`, `/checkout`, `/conta/*`, auth, legais, `/suporte`.

**Admin:** dashboard; produtos/kits/apps/imports/preços; categorias/home/promoções/busca; montadoras/veículos/integrações/3D; fornecedores/fabricantes; pedidos (hub/visões); clientes; estoque; operadores; avisos; logística (ME, frete próprio, caixas); pagamentos; relatórios.

---

## 4. Supabase fonte

| Item | Quantidade / nota |
|------|-------------------|
| Migrations | ~**210** em `fonte-pecas/supabase/migrations/` (+ `proposed/`) |
| Edge functions | **19** deployáveis + `_shared/` |

### Edge functions

| Função | Domínio |
|--------|---------|
| `plate-lookup`, `vehicle-confirm-upsert`, `vehicle-master-sync` | Veículo / INV |
| `interpret-search-nl` | Busca NL / IA |
| `quote-shipping`, `quote-own-delivery`, `melhorenvio-label`, `melhorenvio-webhook`, `melhorenvio-reverse` | Frete |
| `create-fonte-payment`, `create-mp-payment`, `create-asaas-payment`, `pay-asaas-credit-card`, `sync-*`, webhooks MP/Asaas | Pagamento |
| `send-auth-otp`, `verify-auth-otp` | Auth WhatsApp OTP |

**HF:** nenhuma dessas edges está no runtime HF atual. Portar só sob decisão de andar + SoT (Sidicom).

---

## 5. Contratos canônicos fonte (padrão a imitar no CORE)

| Capacidade | Contrato fonte |
|------------|--------------|
| Busca | `search_products` / searchCatalog |
| Preço | `resolve_product_price(s)` |
| Pedido | `place_order` (proibido INSERT direto) |
| Pagamento | `create-fonte-payment` + router híbrido |
| Frete | Edges + `shipping_quotes` |
| Status pedido | RPCs `transition_*` |

HF já tem busca B2B e pipeline de import; **não** tem `place_order` / pay / frete no runtime.

---

## 6. O que a HF já herdou (estrutura)

Ver `MAPA_FAL_PARA_HF.md` + `migrations_hf/` (18 SQL).

| Já na HF | Ainda só na fonte de referência (código) |
|----------|---------------------------|
| Catálogo, PVC, import, admin CRUD | Cart, checkout, orders UI |
| Auth + staff + RLS base | Inventory ops, logistics admin |
| B2B groups/catalogs (próprio HF) | MP/Asaas edges, ME |
| Pricing admin preparado | Payment routing, reports ricos |
| WhatsApp CTA env | OTP WA, NL search edge |

---

## 7. Contagens úteis

| Métrica | Fonte | HF (auditoria 2026-11-23) |
|---------|-----|---------------------------|
| Rotas | ~70 | ~15 públicas + ~21 admin |
| Services top-level | 25 | menor (sem cart/orders/payments/shipping operacionais) |
| Migrations ativas | ~210 | 18 em `migrations_hf` (+ 52 legado não aplicar) |
| Edge functions | 19 | 0 no escopo HF atual |
| Docs planejamento | ~798 | suíte 2036 + auditoria HF |
