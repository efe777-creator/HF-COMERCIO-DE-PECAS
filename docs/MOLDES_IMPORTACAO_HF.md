# Moldes de importação HF

Arquivos em `public/moldes-importacao/` (UTF-8 com BOM, separador `;`).

| Arquivo | Uso |
|---------|-----|
| `01_produtos.csv` | Cadastro de produtos |
| `02_aplicacoes.csv` | Aplicações (SKU existente) |
| `03_bundle_hf.csv` | Produto + aplicação na mesma planilha |
| `04_conversoes_fornecedor.csv` | Código HF ↔ fornecedor |
| `05_custos_fornecedor.csv` | Custo por código fornecedor |
| `06_lista_precos.csv` | Preço de venda em lista (admin) |

## Regras

1. Preview → confirmação → apply (nada grava no preview).
2. Produto novo → `draft` + indisponível; **não** auto-publica.
3. Update parcial: campos vazios no arquivo não apagam dados já salvos.
4. **Categoria / grupo / subgrupo** e montadoras precisam **já existir** (published). Hierarquia = CSV e Admin: **Categoria (L1) → Grupo (L2) → Subgrupo (L3)**.
5. Preços e custos alimentam o admin; a vitrine B2B permanece sem preço público.
6. Fornecedor principal: código `HF-SUP-01` (custo pode usar o SKU do produto).

### Categorias L1 (escopo HF)

Somente: `SUSPENSÃO`, `DIREÇÃO`, `FREIOS`, `TRANSMISSÃO`.

Ex.: `SUSPENSÃO` + `AMORTECEDORES E KITS`; `TRANSMISSÃO` + `HOMOCINÉTICA`. Match case-insensitive / sem acento.
