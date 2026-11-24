# Auditoria runtime profunda HF — mestre (telas × funções × tabelas)

**Data:** 2026-11-23  
**Status:** CANÔNICO (evidência)  
**Satélites:**  
- [HF_AUDITORIA_TELAS_FUNCOES.md](./HF_AUDITORIA_TELAS_FUNCOES.md)  
- [HF_AUDITORIA_TABELAS_RPCS.md](./HF_AUDITORIA_TABELAS_RPCS.md)  
- fonte fino: [HF_REF_TELAS_TABELAS_PROFUNDAS.md](../referencia_tecnica/HF_REF_TELAS_TABELAS_PROFUNDAS.md)  
- Decisão port: [HF_REF_APROVEITAMENTO_DETALHADO.md](../referencia_tecnica/HF_REF_APROVEITAMENTO_DETALHADO.md)

---

## 1. Veredito

O runtime HF é um **catálogo B2B + admin + import + WhatsApp** coerente na maior parte das rotas. Comércio (carrinho/pedido/estoque/pay/frete) **não** está no app — correto frente a Sidicom e flags.

Há **drifts** que precisam correção antes de escalar massa/produção plena:

| Prioridade | Item |
|------------|------|
| P0 | `/conta/veiculos` usa `customer_vehicles` **sem** tabela em `migrations_hf` |
| P1 | Serviços órfãos: favorites, adminCustomerService/orders, AddressForm |
| P1 | Alinhar narrativa D1 (catálogo público vs B2B autenticado) |
| P2 | Limpar AdminPlaceholder / overlaps migration foundation |

---

## 2. Matriz mestre — tela × serviço × tabela × funcionamento

### Loja

| Tela | Serviço | Tabela / RPC | Funcionamento |
|------|---------|--------------|---------------|
| Home | products/search/categories/brands | products, categories, brands, search_products | Descoberta + WA |
| Catálogo / Busca / Cat / Marca | searchService | search_products, products | Listagem published |
| PDP | productService | products, images, refs, PVC | Consulta WA |
| Veículo | vehicleService + search | manufacturers, models, VV, PVC, search | Fitment manual |
| Auth | authService | auth.users, profiles | Login/cadastro/reset |
| Conta home/perfil | customerService | customers, customer_users, profiles | B2B link |
| Conta veículos | customerVehicleService | **customer_vehicles (FALTANDO no SQL HF)** | **QUEBRADO/RISCO** até migration |

### Admin

| Tela | Serviço | Tabela / RPC | Funcionamento |
|------|---------|--------------|---------------|
| Produtos CRUD | adminProductService | products + filhos | Cadastro mestre |
| Imports | import/* + admin*Import | imports, import_items, apply_* | Draft by default |
| Categorias/Marcas/Montadoras/Veículos/Fornecedores | admin* | tabelas respectivas | Taxonomia |
| Preços | adminPrice* | price_lists* | Staff; vitrine off |
| Listas/Clientes/Grupos | adminB2b / catalog list | catalogs*, customers* | Visibilidade B2B |
| Operadores | operators/staff | profiles.role | Staff |

---

## 3. O que funciona de ponta a ponta (OK)

1. Publicar produto (`status=published`) → aparece na busca (com RLS 08).  
2. Import produtos/apps → draft → staff publica.  
3. PDP → WhatsApp com número de env.  
4. Staff CRUD catálogo completo.  
5. Admin B2B entidades (mesmo com flag específica off na loja).  
6. Listas de preço staff (sem exposição loja).

---

## 4. O que NÃO funciona / não deve

| Fluxo | Motivo |
|-------|--------|
| Comprar / pagar / frete no site | Flags off; Sidicom |
| Estoque na vitrine | Sem inventory HF |
| Favoritos | Sem tabela + serviço morto |
| Conta veículos em DB limpo só com migrations_hf | Tabela ausente |
| Catálogo por cliente na loja | Flag `customer_specific_catalog_enabled=false` |

---

## 5. Cruzamento HF × referência (resumo operacional)

| Capacidade | fonte tela/tabela | HF | Ação |
|------------|-----------------|-----|------|
| Catálogo/busca/PDP | Sim | Sim | Manter |
| PVC / veículo | Sim | Sim | Manter |
| Import | Sim | Sim | Manter |
| Carrinho/checkout/pedido | Sim | Não | Não portar agora |
| Estoque/pay/frete admin | Sim | Não | Sidicom / Andares 2–6 |
| Kits / 3D / home promo admin | Sim | Não | Avaliar depois |
| B2B groups/catalogs | Não (B2C) | Sim | Próprio HF |

Detalhe: `HF_REF_TELAS_TABELAS_PROFUNDAS.md` + mestre aproveitamento.

---

## 6. Checklist de correção (próxima marcha de código)

- [ ] Migration `customer_vehicles` alinhada ao service **ou** feature-flag da tela  
- [ ] Remover/arquivar `favoriteService`, `adminCustomerService` orders, AddressForm se não usados  
- [ ] Remover `AdminPlaceholderPage` ou documentar  
- [ ] Decisão D1 registrada na Visão/Fase 1  
- [ ] Runbook fresh DB: numbered XOR foundation  

---

## 7. Como navegar

| Pergunta | Doc |
|----------|-----|
| Quais telas existem e o que fazem? | `HF_AUDITORIA_TELAS_FUNCOES.md` |
| Quais tabelas/RPCs? | `HF_AUDITORIA_TABELAS_RPCS.md` |
| O que a referência tem de tela/tabela? | `../referencia_tecnica/HF_REF_TELAS_TABELAS_PROFUNDAS.md` |
| Posso copiar X da referência? | `../referencia_tecnica/HF_REF_APROVEITAMENTO_DETALHADO.md` |
