# Homologação — Gate 01 · Andar 1 Catálogo Digital

**Versão:** 1.4  
**Data:** 2026-11-24  
**PRD:** [PRD_FASE_01.md](./PRD_FASE_01.md) v1.1 · [RASTREABILIDADE.md](./RASTREABILIDADE.md)  
**Auditoria:** [AUDITORIA_GATE01_2026-11-24.md](./AUDITORIA_GATE01_2026-11-24.md)  
**D5 (opcional):** [D5_SIDICOM_QUESTIONARIO_ENVIO.md](./D5_SIDICOM_QUESTIONARIO_ENVIO.md)  
**Aceite:** [CRITERIOS_DE_ACEITE.md](./CRITERIOS_DE_ACEITE.md)

---

## 1. Objetivo do Gate 01

Declarar o Andar 1 **homologado** para operação de catálogo + admin + WA, e liberar o **planejamento** (não a implementação cega) do Andar 2 — **pedidos oficiais no HF**.

---

## 2. Checklist Gate 01

### Produto / UX
- [x] Site institucional (home, sobre, atendimento) validado vs hfcomerciodepecas.com *(endereço/horário/e-mail/WA alinhados; smoke 2026-11-24)*  
- [x] Catálogo: busca, categoria, marca, PDP OK na cobertura *(busca `pivo` → 13 hits; 49 published; PDP PVI0127)*  
- [x] Seletor `/veiculo` + aplicações OK na cobertura *(cascata montadoras/modelos)*  
- [x] Sem preço público na vitrine *(D1 + `price_enabled: false`; UI “Consultar disponibilidade”)*  
- [x] CTA WhatsApp operacional (env) *(`VITE_WHATSAPP_NUMBER` → wa.me/5511994370003 no PDP)*  
- [x] Leads/cotações chegam à equipe (processo definido) — **processo ops Gate:** cotação/lead = WhatsApp + atendimento humano; módulo CRM = waiver RF-017  

### Admin / dados
- [x] CRUD produtos + taxonomia + veículos homologado *(admin `/admin/produtos` acessível staff)*  
- [x] Imports draft → publish + moldes OK *(hub `/admin/produtos/importacoes` acessível)*  
- [x] Clientes/grupos/listas admin OK *(rotas CLIENTES no admin)*  
- [x] Massa/qualidade mínima acordada para go-live — **49 published + 384 PVC + 186 VV**; expansão contínua pós-Gate  

### Segurança / engenharia
- [x] Auth staff + RLS verificados *(staff `gate01.staff@…` acessa `/admin`; customer redirecionado a `/`; anon vê published)*  
- [x] `npm test` + `npm run build` OK *(55 testes; build 2026-11-24)*  
- [x] Sem secrets/projeto de terceiros  
- [x] Tokens só `--hf-*`  

### Correções e decisões
- [x] P0 `customer_vehicles`: migration + **CRUD logado OK** (add/list/remove 2026-11-24)  
- [x] P1 órfãos: favoriteService / adminCustomerService / AdminPlaceholder removidos (AddressForm adiado)  
- [x] **D1** registrado: published **aberto**; sem preço público  
- [x] **D5 fora do Gate**: Sidicom adiado  
- [x] **D6**: Andar 2 = pedidos oficiais digitais **no HF**  
- [x] **Fix Gate:** `handle_new_user` alinhado ao B2B HF (`migrations_hf/13_fix_handle_new_user_hf_b2b.sql`) — não usa `customers.profile_id` inexistente  

### Documentação
- [x] PRD Andar 1 v1.1 + satélites + rastreabilidade + auditoria Gate  
- [x] Índice aponta Fase 1  
- [x] Pendências residuais / waivers listados abaixo  

---

## 3. Explicitamente NÃO exigido no Gate 01

- Estoque no app  
- Pedidos / checkout / pagamento *(Andar 2)*  
- NF / fiscal  
- Integração Sidicom / envio D5  
- 99 Entrega / Uber Direct produção  
- Agentes IA produção  
- ERP CORE substituindo Sidicom  
- Placa veicular  
- Adaptive admin completo  
- RF-011 / RF-012 / RF-014 / RF-017 (módulo) / RF-025 *(waivers)*  

---

## 4. Pendências residuais / waivers

| ID | Descrição | Dono | Prazo |
|----|-----------|------|-------|
| **WAIVER** RF-011 | Posição 3 eixos na PVC | Produto | Pós-Gate |
| **WAIVER** RF-012 | Fab ≠ ano-modelo | Produto | Pós-Gate |
| **WAIVER** RF-014 | Status validação apps | Produto | Pós-Gate |
| **WAIVER** RF-017 | Módulo leads/CRM | Produto | Pós-Gate (ops WA OK no Gate) |
| **WAIVER** RF-025 | CRUD campanhas | Produto | Pós-Gate (destaques home OK) |
| D7 | Estoque/NF vs HF no Andar 2 | Dono HF | Antes PRD Andar 2 |
| D5 (opcional) | Questionário Sidicom | Dono HF | Sob demanda |
| Contas smoke | `gate01.teste@hfcomerciodepecas.com` (customer) · `gate01.staff@hfcomerciodepecas.com` (admin) — senha **não versionada**; rotacionar após Gate | Tech | Pós-assinatura |

---

## 5. Aprovação formal

| Papel | Nome | Data | Assinatura / OK |
|-------|------|------|-----------------|
| Produto / dono HF | | | ☐ aguarda assinatura |
| Operação / catálogo | | | ☐ aguarda assinatura |
| Tecnologia | | 2026-11-24 | Smoke + auditoria executados — **pronto para OK do dono** |

**Resultado:** ☐ Gate 01 APROVADO · ☐ Aprovado com waiver · ☐ Reprovado  

**Waiver (se houver):** RF-011, RF-012, RF-014, RF-017 (módulo), RF-025 — explícitos na §4; não bloqueiam assinatura.

---

## 6. Liberação do próximo passo

Com Gate 01 aprovado pelo dono:

1. Manter catálogo em operação/melhoria contínua.  
2. Alinhar **D7** (estoque/NF) e elaborar **PRD Andar 2** (pedidos oficiais HF) antes de codar.  
3. D5 Sidicom só quando houver intenção real de sync.  
4. Não ligar IA/99/Uber em produção.  
5. Rotacionar/desativar contas `gate01.*` de smoke se não forem mais necessárias.
