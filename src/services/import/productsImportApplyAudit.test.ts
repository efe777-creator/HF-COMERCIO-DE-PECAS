import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const migration = join(
  process.cwd(),
  'supabase/migrations_hf/22_products_import_autocreate_categories.sql',
)
const schema = join(process.cwd(), 'supabase/migrations_hf/02_catalog.sql')
const helpers = join(
  process.cwd(),
  'supabase/migrations_hf/06_import_pipeline_schema.sql',
)

describe('apply_catalog_products_import — auditoria (migrations_hf)', () => {
  const sql = readFileSync(migration, 'utf8')
  const catalog = readFileSync(schema, 'utf8')
  const pipe = readFileSync(helpers, 'utf8')

  it('RPC + staff_can + grant', () => {
    expect(sql).toMatch(/apply_catalog_products_import/)
    expect(sql).toMatch(/staff_can_import_catalog/)
    expect(sql).toMatch(/grant execute on function public\.apply_catalog_products_import/i)
    expect(pipe).toMatch(/staff_can_import_catalog/)
  })

  it('rejeita reapply; soft-fail por linha com exception when others no loop', () => {
    expect(sql).toMatch(/ja foi processada/)
    const loop = sql.slice(sql.indexOf('for r in'))
    expect(loop).toMatch(/exception\s+when\s+others/i)
    expect(loop).toMatch(/v_failed/)
  })

  it('auto-cria categorias e resolve hierarquia + descricoes', () => {
    expect(sql).toMatch(/short_description/)
    expect(sql).toMatch(/insert into public\.product_categories/i)
    expect(sql).toMatch(/categories_created/)
    expect(sql).toMatch(/parent_id/)
  })

  it('schema e RPC gravam posicao/lado', () => {
    expect(catalog).toMatch(/posicao/)
    expect(catalog).toMatch(/lado/)
    expect(sql).toMatch(/posicao = v_posicao/)
    expect(sql).toMatch(/lado = v_lado/)
  })
})
