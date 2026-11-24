# HF — Modelo operacional (Blocos 03–05 lite)

**Versão:** 0.2  
**Data:** 2026-11-23  
**Status:** CANÔNICO (estrutura; RACI com nomes ainda Pendente)  
**Visão:** [HF_VISAO_2036.md](../entrada/HF_VISAO_2036.md)  
**PRD-Mestre §4 (departamentos):** [HF_PRD_MESTRE_2036.md](../entrada/HF_PRD_MESTRE_2036.md)  
**Site:** [hfcomerciodepecas.com](https://hfcomerciodepecas.com) — endereço e horários alinhados  
**Runbooks:** [HF_RUNBOOKS.md](./HF_RUNBOOKS.md)

---

## 1. Premissa

O sistema atende à **operação da distribuidora**. Antes de ligar pedidos/estoque no software, este documento deve nomear **quem decide o quê**.

Base física conhecida: Guarulhos/SP (`business.ts`). Planta completa (CD, docas, frota): **LACUNA**.

---

## 2. Estrutura física (Bloco 03) — a preencher

| Item | Estado | Notas |
|------|--------|-------|
| Sede / loja / escritório | Parcial | Endereço Rosa Molina Pannochia |
| Centro de distribuição | Lacuna | Capacidade, turnos, layout |
| Frota / parceiros delivery | Lacuna | Própria / terceiros / híbrido (D3 visão) |
| Filiais futuras | Lacuna | Bloco 18 |

---

## 3. Departamentos e RACI (Bloco 04) — esqueleto

Mapear contra rotas admin já existentes:

| Processo | Admin / superfície | R (responsável) | A (aprovador) | C | I | Status |
|----------|--------------------|-----------------|---------------|---|---|--------|
| Cadastro manual de produto | `/admin/produtos` | _TBD_ | _TBD_ | | | App pronto |
| Importação catálogo / apps | `/admin/produtos/importacoes`… | _TBD_ | _TBD_ | | | App pronto |
| Taxonomia / veículos | categorias, montadoras, veículos, fabricantes | _TBD_ | _TBD_ | | | App pronto |
| Fornecedores / custos / conversões | fornecedores + imports | _TBD_ | _TBD_ | | | App pronto |
| Listas de preço (staff) | `/admin/precos` | _TBD_ | _TBD_ | | | Preparado |
| Clientes B2B / grupos / listas | clientes, grupos, listas | _TBD_ | _TBD_ | | | App pronto |
| Operadores / acessos staff | `/admin/operadores` | _TBD_ | _TBD_ | | | App pronto |
| Atendimento WhatsApp | CTA site + telefones | _TBD_ | _TBD_ | | | Processo humano |
| Publicação (`draft`→`published`) | produto admin | _TBD_ | _TBD_ | | | Regra draft import |
| Pedidos / estoque / expedição | — | _TBD_ | _TBD_ | | | Futuro |

---

## 4. Operação da distribuidora (Bloco 05) — fluxos alvo

Fluxos a descrever (ainda sem detalhe):

1. **Entrada de catálogo** (manual / import / revisão / publish).  
2. **Atendimento e cotação** (hoje: WhatsApp).  
3. **Formação de preço** (admin preparado → política comercial).  
4. **Pedido e reserva** (futuro).  
5. **Separação, expedição, delivery** (futuro).  
6. **Pós-venda / devolução** (futuro).

Enquanto 4–6 não existirem no software, o canal oficial de venda continua **humano + WhatsApp**.

---

## 5. Horário e canais (atual)

| Canal | Valor |
|-------|-------|
| Seg–Sex | 08h–18h |
| Sáb | 09h–14h |
| Instagram | @hfsuspensao |
| E-mail | marketing@hfcomerciodepecas.com |

---

## 6. Próximos preenchimentos

- [ ] Organograma com nomes/papéis  
- [ ] RACI completo da tabela §3  
- [ ] SLA de atendimento WA  
- [ ] Política draft→published  
- [ ] Descrição do CD e delivery (D3)
