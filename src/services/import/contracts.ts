import type { ImportContract, ImportKind } from './types'

export const IMPORT_MAX_ROWS = 2000

/** Frente A — cadastro de produto (sem montadora). */
const catalogContract: ImportContract = {
  kind: 'catalog',
  maxRows: IMPORT_MAX_ROWS,
  fields: [
    {
      key: 'sku',
      aliases: ['codigo', 'codigo_fal', 'sku', 'cod', 'code'],
      required: true,
    },
    {
      key: 'name',
      aliases: ['nome', 'name', 'produto'],
      required: true,
    },
    {
      key: 'categoria',
      aliases: ['categoria', 'category', 'cat'],
      required: true,
    },
    {
      key: 'grupo',
      aliases: ['grupo', 'group'],
      required: true,
    },
    {
      key: 'subgrupo',
      aliases: ['subgrupo', 'sub_grupo', 'subgroup'],
      required: false,
    },
    {
      key: 'posicao',
      aliases: ['posicao', 'posição', 'position', 'pos'],
      required: false,
    },
    {
      key: 'lado',
      aliases: ['lado', 'side', 'ld_le'],
      required: false,
    },
    {
      key: 'descricao_curta',
      aliases: ['descricao_curta', 'short_description', 'desc_curta', 'resumo'],
      required: false,
    },
    {
      key: 'descricao',
      aliases: ['descricao', 'description', 'desc', 'descricao_longa'],
      required: false,
    },
  ],
}

const supplierConversionContract: ImportContract = {
  kind: 'supplier_conversion',
  maxRows: IMPORT_MAX_ROWS,
  fields: [
    {
      key: 'sku',
      aliases: ['codigo_fal', 'codigo', 'sku', 'cod_fal'],
      required: true,
    },
    {
      key: 'supplier_sku',
      aliases: ['codigo_fornecedor', 'cod_fornecedor', 'supplier_sku', 'sku_fornecedor'],
      required: true,
    },
  ],
}

const supplierCostContract: ImportContract = {
  kind: 'supplier_cost',
  maxRows: IMPORT_MAX_ROWS,
  fields: [
    {
      key: 'supplier_sku',
      aliases: ['codigo_fornecedor', 'cod_fornecedor', 'supplier_sku', 'codigo', 'sku'],
      required: true,
    },
    {
      key: 'cost',
      aliases: ['custo', 'cost', 'preco_custo', 'valor_custo'],
      required: true,
    },
  ],
}

const priceListContract: ImportContract = {
  kind: 'price_list',
  maxRows: IMPORT_MAX_ROWS,
  fields: [
    {
      key: 'sku',
      aliases: ['sku', 'codigo', 'codigo_fal', 'cod'],
      required: true,
    },
    {
      key: 'price',
      aliases: ['preco', 'preço', 'price', 'valor', 'venda'],
      required: true,
    },
  ],
}

/**
 * Frente B — aplicações (compatibilidade).
 * Nome opcional; produto NÃO é criado — SKU deve existir.
 */
const catalogApplicationsContract: ImportContract = {
  kind: 'catalog_applications',
  maxRows: IMPORT_MAX_ROWS,
  fields: [
    {
      key: 'sku',
      aliases: ['codigo', 'codigo_fal', 'sku', 'cod', 'code'],
      required: true,
    },
    {
      key: 'name',
      aliases: ['nome', 'name', 'descricao', 'description', 'produto'],
      required: false,
    },
    {
      key: 'montadora',
      aliases: ['montadora', 'oem', 'fabricante_veiculo', 'vehicle_make', 'make'],
      required: true,
    },
    {
      key: 'modelo',
      aliases: ['modelo', 'model', 'vehicle_model'],
      required: true,
    },
    {
      key: 'versao',
      aliases: ['versao', 'versão', 'version', 'motor', 'engine'],
      required: false,
    },
    {
      key: 'ano_inicio',
      aliases: ['ano_inicio', 'ano_ini', 'year_start', 'de', 'inicio', 'data_inicio'],
      required: false,
    },
    {
      key: 'ano_fim',
      aliases: ['ano_fim', 'ano_final', 'year_end', 'ate', 'até', 'fim', 'data_fim'],
      required: false,
    },
  ],
}

/** Frente C — layout HF completo (produto + aplicação na mesma linha). */
const catalogHfBundleContract: ImportContract = {
  kind: 'catalog',
  maxRows: IMPORT_MAX_ROWS,
  fields: [
    ...catalogContract.fields,
    {
      key: 'montadora',
      aliases: ['montadora', 'oem', 'fabricante_veiculo', 'vehicle_make', 'make'],
      required: true,
    },
    {
      key: 'modelo',
      aliases: ['modelo', 'model', 'vehicle_model'],
      required: true,
    },
    {
      key: 'versao',
      aliases: ['versao', 'versão', 'version', 'motor', 'engine'],
      required: false,
    },
    {
      key: 'ano_inicio',
      aliases: ['ano_inicio', 'ano_ini', 'year_start', 'de', 'inicio', 'data_inicio'],
      required: false,
    },
    {
      key: 'ano_fim',
      aliases: ['ano_fim', 'ano_final', 'year_end', 'ate', 'até', 'fim', 'data_fim'],
      required: false,
    },
  ],
}

const CONTRACTS: Record<ImportKind, ImportContract> = {
  catalog: catalogContract,
  catalog_applications: catalogApplicationsContract,
  supplier_conversion: supplierConversionContract,
  supplier_cost: supplierCostContract,
  price_list: priceListContract,
}

export function getImportContract(kind: ImportKind): ImportContract {
  return CONTRACTS[kind]
}

export function getHfBundleContract(): ImportContract {
  return catalogHfBundleContract
}

export function listImportKinds(): ImportKind[] {
  return Object.keys(CONTRACTS) as ImportKind[]
}
