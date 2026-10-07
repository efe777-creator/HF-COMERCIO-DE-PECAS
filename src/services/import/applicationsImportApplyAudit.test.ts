import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const migration = join(
  process.cwd(),
  'supabase/migrations/20261007140000_apply_catalog_applications_import.sql',
)
const hardening = join(
  process.cwd(),
  'supabase/migrations/20261007160000_apps_import_no_create_product.sql',
)

describe('apply_catalog_applications_import — auditoria migration', () => {
  const sql = readFileSync(migration, 'utf8')
  const hardened = readFileSync(hardening, 'utf8')

  it('define RPC com staff_can_import_catalog + grant authenticated', () => {
    expect(sql).toMatch(/create or replace function public\.apply_catalog_applications_import/)
    expect(sql).toMatch(/staff_can_import_catalog\(\)/)
    expect(sql).toMatch(
      /grant execute on function public\.apply_catalog_applications_import\(uuid\) to authenticated/i,
    )
    expect(sql).toMatch(/revoke all on function public\.apply_catalog_applications_import/i)
  })

  it('rejeita reapply do mesmo import_id (nivel A)', () => {
    expect(sql).toMatch(/status in \('done', 'importing', 'failed'\)/)
    expect(sql).toMatch(/ja foi processada/)
  })

  it('somente kind catalog_applications e status preview/validated', () => {
    expect(sql).toMatch(/catalog_applications/)
    expect(sql).toMatch(/preview.*validated|validated/)
  })

  it('rollback total: sem exception when others no loop de mutacao', () => {
    // catalog import engole erros por linha; apply de aplicacoes NAO deve
    const loopStart = sql.indexOf('for r in')
    const loopBody = sql.slice(loopStart)
    expect(loopBody).not.toMatch(/exception\s+when\s+others/i)
  })

  it('relatorio jsonb estruturado', () => {
    for (const key of [
      'created_products',
      'existing_products',
      'created_applications',
      'updated_applications',
      'already_covered',
      'skipped_review',
      'skipped_error',
      'total_processed',
    ]) {
      expect(sql).toContain(key)
    }
  })

  it('periodo na PVC; nao usa VV.year como fonte de verdade da aplicacao', () => {
    expect(sql).toMatch(/year_start/)
    expect(sql).toMatch(/year_end/)
    expect(sql).toMatch(/product_vehicle_compatibility/)
  })

  it('VV ambigua sem vinculo → raise revisao (nao escolhe mais antigo)', () => {
    expect(sql).toMatch(/versoes duplicadas/)
    expect(sql).not.toMatch(/order by vv\.created_at/i)
  })

  it('hardening: nao cria produto (SKU inexistente = erro)', () => {
    expect(hardened).toMatch(/NUNCA cria produto|produto nao cadastrado/)
    expect(hardened).not.toMatch(/elsif v_create_product then/)
    const loop = hardened.slice(hardened.indexOf('for r in'))
    expect(loop).not.toMatch(/insert into public\.products/i)
  })
})
