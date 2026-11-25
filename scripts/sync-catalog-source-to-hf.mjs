#!/usr/bin/env node
/**
 * Importa catálogo de fonte externa (somente escrita na HF).
 *
 * Env (local / CI secrets — nunca commitar):
 *   SOURCE_SUPABASE_URL, SOURCE_SERVICE_ROLE_KEY
 *   HF_SUPABASE_URL, HF_SERVICE_ROLE_KEY
 *
 * Uso:
 *   node scripts/sync-catalog-source-to-hf.mjs --dry-run
 *   node scripts/sync-catalog-source-to-hf.mjs --apply
 *
 * Ordem: manufacturers → models → vehicle_versions → brands/categories
 *        → products (match SKU) → references → PVC → product_images+storage
 *
 * Não apaga produtos HF existentes. Não copia preço/checkout/orders.
 */
import { createClient } from '@supabase/supabase-js'
import { readFileSync, existsSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = resolve(__dirname, '..')

function loadEnvFile(name) {
  const p = resolve(root, name)
  if (!existsSync(p)) return
  const text = readFileSync(p, 'utf8')
  for (const line of text.split(/\r?\n/)) {
    const t = line.trim()
    if (!t || t.startsWith('#')) continue
    const i = t.indexOf('=')
    if (i < 0) continue
    const k = t.slice(0, i).trim()
    let v = t.slice(i + 1).trim()
    if (
      (v.startsWith('"') && v.endsWith('"')) ||
      (v.startsWith("'") && v.endsWith("'"))
    ) {
      v = v.slice(1, -1)
    }
    if (!(k in process.env) || process.env[k] === '') process.env[k] = v
  }
}

loadEnvFile('.env.local')
loadEnvFile('.env.sync.local')

const args = new Set(process.argv.slice(2))
const dryRun = args.has('--dry-run') || !args.has('--apply')
const apply = args.has('--apply')

function req(name) {
  const v = process.env[name]?.trim()
  if (!v) throw new Error(`Env ausente: ${name}`)
  return v
}

async function count(sb, table, filter) {
  let q = sb.from(table).select('*', { count: 'exact', head: true })
  if (filter) q = filter(q)
  const { count: c, error } = await q
  if (error) throw new Error(`${table}: ${error.message}`)
  return c ?? 0
}

async function fetchAll(sb, table, select, pageSize = 1000) {
  const rows = []
  let from = 0
  for (;;) {
    const { data, error } = await sb.from(table).select(select).range(from, from + pageSize - 1)
    if (error) throw new Error(`${table} fetch: ${error.message}`)
    const batch = data ?? []
    rows.push(...batch)
    if (batch.length < pageSize) break
    from += pageSize
  }
  return rows
}

function norm(s) {
  return String(s ?? '')
    .trim()
    .toLowerCase()
}

async function main() {
  console.log(`\n=== sync-catalog-source-to-hf (${dryRun ? 'DRY-RUN' : 'APPLY'}) ===\n`)

  const source = createClient(req('SOURCE_SUPABASE_URL'), req('SOURCE_SERVICE_ROLE_KEY'), {
    auth: { persistSession: false, autoRefreshToken: false },
  })
  const hf = createClient(req('HF_SUPABASE_URL'), req('HF_SERVICE_ROLE_KEY'), {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  const inventory = {
    source: {
      manufacturers: await count(source, 'manufacturers'),
      models: await count(source, 'models'),
      vehicle_versions: await count(source, 'vehicle_versions'),
      products: await count(source, 'products'),
      product_references: await count(source, 'product_references'),
      pvc: await count(source, 'product_vehicle_compatibility'),
      product_images: await count(source, 'product_images'),
    },
    hf: {
      manufacturers: await count(hf, 'manufacturers'),
      models: await count(hf, 'models'),
      vehicle_versions: await count(hf, 'vehicle_versions'),
      products: await count(hf, 'products'),
      product_references: await count(hf, 'product_references'),
      pvc: await count(hf, 'product_vehicle_compatibility'),
      product_images: await count(hf, 'product_images'),
    },
  }

  console.log('Inventário:')
  console.table({
    manufacturers: { source: inventory.source.manufacturers, HF: inventory.hf.manufacturers },
    models: { source: inventory.source.models, HF: inventory.hf.models },
    vehicle_versions: { source: inventory.source.vehicle_versions, HF: inventory.hf.vehicle_versions },
    products: { source: inventory.source.products, HF: inventory.hf.products },
    product_references: {
      source: inventory.source.product_references,
      HF: inventory.hf.product_references,
    },
    pvc: { source: inventory.source.pvc, HF: inventory.hf.pvc },
    product_images: { source: inventory.source.product_images, HF: inventory.hf.product_images },
  })

  const sourceProducts = await fetchAll(
    source,
    'products',
    'id, sku, name, slug, description, short_description, status, brand_id, category_id, manufacturer_code, posicao, lado, is_available',
  )
  const hfProducts = await fetchAll(hf, 'products', 'id, sku')
  const hfSku = new Map(hfProducts.map((p) => [norm(p.sku), p]))

  let matchSku = 0
  let newSku = 0
  for (const p of sourceProducts) {
    if (hfSku.has(norm(p.sku))) matchSku += 1
    else newSku += 1
  }

  console.log(`\nProdutos na fonte: ${sourceProducts.length}`)
  console.log(`  SKU já na HF (update/merge): ${matchSku}`)
  console.log(`  SKU novos (insert, reusar UUID source): ${newSku}`)

  if (dryRun && !apply) {
    console.log('\nDry-run concluído. Passe --apply para gravar (manufacturers→…→images).')
    console.log('Apply exige SERVICE_ROLE em .env.sync.local (anon só inventário/RLS).')
    console.log('Fallback sem service role: admin → Importar imagens por código.\n')
    return
  }

  // --- APPLY (incremental, seguro) ---
  const stats = {
    manufacturers_upsert: 0,
    models_upsert: 0,
    versions_upsert: 0,
    products_insert: 0,
    products_update: 0,
    refs_insert: 0,
    pvc_upsert: 0,
    images_copied: 0,
    image_errors: 0,
  }

  // 1 manufacturers
  const sourceMfr = await fetchAll(source, 'manufacturers', 'id, name, slug')
  const hfMfr = await fetchAll(hf, 'manufacturers', 'id, name')
  const mfrByName = new Map(hfMfr.map((m) => [norm(m.name), m]))
  const mfrIdMap = new Map() // sourceId -> hfId

  for (const m of sourceMfr) {
    const existing = mfrByName.get(norm(m.name))
    if (existing) {
      mfrIdMap.set(m.id, existing.id)
      continue
    }
    const { data, error } = await hf
      .from('manufacturers')
      .upsert({ id: m.id, name: m.name, slug: m.slug || norm(m.name).replace(/\s+/g, '-') }, {
        onConflict: 'id',
      })
      .select('id')
      .single()
    if (error) {
      const { data: byName } = await hf
        .from('manufacturers')
        .insert({ name: m.name, slug: m.slug || norm(m.name).replace(/\s+/g, '-') })
        .select('id')
        .single()
      if (byName) {
        mfrIdMap.set(m.id, byName.id)
        stats.manufacturers_upsert += 1
      } else {
        console.warn('manufacturer skip', m.name, error.message)
      }
    } else {
      mfrIdMap.set(m.id, data.id)
      stats.manufacturers_upsert += 1
    }
  }

  // 2 models
  const sourceModels = await fetchAll(
    source,
    'models',
    'id, name, slug, manufacturer_id, production_year_start, production_year_end',
  )
  const hfModels = await fetchAll(hf, 'models', 'id, name, manufacturer_id')
  const modelKey = (manufacturerId, name) => `${manufacturerId}::${norm(name)}`
  const modelByKey = new Map(hfModels.map((m) => [modelKey(m.manufacturer_id, m.name), m]))
  const modelIdMap = new Map()

  for (const m of sourceModels) {
    const hfMfrId = mfrIdMap.get(m.manufacturer_id)
    if (!hfMfrId) continue
    const key = modelKey(hfMfrId, m.name)
    const existing = modelByKey.get(key)
    if (existing) {
      modelIdMap.set(m.id, existing.id)
      const patch = {}
      if (m.production_year_start != null) patch.production_year_start = m.production_year_start
      if (m.production_year_end != null) patch.production_year_end = m.production_year_end
      if (Object.keys(patch).length) {
        await hf.from('models').update(patch).eq('id', existing.id)
      }
      continue
    }
    const row = {
      id: m.id,
      name: m.name,
      slug: m.slug || norm(m.name).replace(/\s+/g, '-'),
      manufacturer_id: hfMfrId,
      production_year_start: m.production_year_start ?? null,
      production_year_end: m.production_year_end ?? null,
    }
    const { data, error } = await hf.from('models').upsert(row, { onConflict: 'id' }).select('id').single()
    if (error) {
      const { data: ins } = await hf
        .from('models')
        .insert({
          name: m.name,
          slug: row.slug,
          manufacturer_id: hfMfrId,
          production_year_start: row.production_year_start,
          production_year_end: row.production_year_end,
        })
        .select('id')
        .single()
      if (ins) {
        modelIdMap.set(m.id, ins.id)
        stats.models_upsert += 1
      } else console.warn('model skip', m.name, error.message)
    } else {
      modelIdMap.set(m.id, data.id)
      stats.models_upsert += 1
    }
  }

  // 3 vehicle_versions
  const sourceVv = await fetchAll(
    source,
    'vehicle_versions',
    'id, model_id, year, engine, version_name, fuel, transmission',
  )
  const hfVv = await fetchAll(
    hf,
    'vehicle_versions',
    'id, model_id, year, engine, version_name',
  )
  const vvKey = (modelId, year, engine, versionName) =>
    `${modelId}::${year ?? ''}::${norm(engine)}::${norm(versionName)}`
  const vvByKey = new Map(
    hfVv.map((v) => [vvKey(v.model_id, v.year, v.engine, v.version_name), v]),
  )
  const vvIdMap = new Map()

  for (const v of sourceVv) {
    const hfModelId = modelIdMap.get(v.model_id)
    if (!hfModelId) continue
    const key = vvKey(hfModelId, v.year, v.engine, v.version_name)
    const existing = vvByKey.get(key)
    if (existing) {
      vvIdMap.set(v.id, existing.id)
      continue
    }
    const row = {
      id: v.id,
      model_id: hfModelId,
      year: v.year,
      engine: v.engine,
      version_name: v.version_name,
      fuel: v.fuel ?? null,
      transmission: v.transmission ?? null,
    }
    const { data, error } = await hf
      .from('vehicle_versions')
      .upsert(row, { onConflict: 'id' })
      .select('id')
      .single()
    if (error) {
      const { data: ins } = await hf
        .from('vehicle_versions')
        .insert({
          model_id: hfModelId,
          year: v.year,
          engine: v.engine,
          version_name: v.version_name,
          fuel: v.fuel ?? null,
          transmission: v.transmission ?? null,
        })
        .select('id')
        .single()
      if (ins) {
        vvIdMap.set(v.id, ins.id)
        stats.versions_upsert += 1
      } else console.warn('vv skip', error.message)
    } else {
      vvIdMap.set(v.id, data.id)
      stats.versions_upsert += 1
    }
  }

  // 4 brands / categories — only those referenced by products (lazy create by id reuse)
  const sourceBrands = await fetchAll(source, 'product_brands', 'id, name, slug')
  for (const b of sourceBrands) {
    await hf.from('product_brands').upsert(
      { id: b.id, name: b.name, slug: b.slug || norm(b.name).replace(/\s+/g, '-') },
      { onConflict: 'id' },
    )
  }
  const sourceCats = await fetchAll(source, 'product_categories', 'id, name, slug, parent_id')
  for (const c of sourceCats) {
    await hf.from('product_categories').upsert(
      {
        id: c.id,
        name: c.name,
        slug: c.slug || norm(c.name).replace(/\s+/g, '-'),
        parent_id: c.parent_id,
      },
      { onConflict: 'id' },
    )
  }

  // 5 products
  const productIdMap = new Map() // sourceId -> hfId
  for (const p of sourceProducts) {
    const existing = hfSku.get(norm(p.sku))
    if (existing) {
      productIdMap.set(p.id, existing.id)
      const { error } = await hf
        .from('products')
        .update({
          name: p.name,
          description: p.description,
          short_description: p.short_description,
          status: p.status === 'published' ? 'published' : p.status,
          brand_id: p.brand_id,
          category_id: p.category_id,
          manufacturer_code: p.manufacturer_code,
          posicao: p.posicao ?? null,
          lado: p.lado ?? null,
          is_available: p.is_available ?? true,
        })
        .eq('id', existing.id)
      if (!error) stats.products_update += 1
    } else {
      const { error } = await hf.from('products').insert({
        id: p.id,
        sku: p.sku,
        name: p.name,
        slug: p.slug || norm(p.sku),
        description: p.description,
        short_description: p.short_description,
        status: p.status === 'published' ? 'published' : 'draft',
        brand_id: p.brand_id,
        category_id: p.category_id,
        manufacturer_code: p.manufacturer_code,
        posicao: p.posicao ?? null,
        lado: p.lado ?? null,
        is_available: p.is_available ?? true,
        price: 0,
      })
      if (error) {
        console.warn('product insert', p.sku, error.message)
      } else {
        productIdMap.set(p.id, p.id)
        stats.products_insert += 1
      }
    }
  }

  // 6 references
  const sourceRefs = await fetchAll(
    source,
    'product_references',
    'product_id, code, ref_type, brand_label',
  )
  for (const r of sourceRefs) {
    const hfPid = productIdMap.get(r.product_id)
    if (!hfPid) continue
    const { data: exists } = await hf
      .from('product_references')
      .select('id')
      .eq('product_id', hfPid)
      .eq('code', r.code)
      .eq('ref_type', r.ref_type ?? 'oem')
      .maybeSingle()
    if (exists) continue
    const { error } = await hf.from('product_references').insert({
      product_id: hfPid,
      code: r.code,
      ref_type: r.ref_type ?? 'oem',
      brand_label: r.brand_label ?? null,
    })
    if (!error) stats.refs_insert += 1
  }

  // 7 PVC
  const sourcePvc = await fetchAll(
    source,
    'product_vehicle_compatibility',
    'product_id, vehicle_version_id, year_start, year_end, notes, lado, posicao_long, posicao_vert',
  )
  for (const row of sourcePvc) {
    const hfPid = productIdMap.get(row.product_id)
    const hfVid = vvIdMap.get(row.vehicle_version_id)
    if (!hfPid || !hfVid) continue
    const payload = {
      product_id: hfPid,
      vehicle_version_id: hfVid,
      year_start: row.year_start ?? null,
      year_end: row.year_end ?? null,
      notes: row.notes ?? null,
      lado: row.lado ?? null,
      posicao_long: row.posicao_long ?? null,
      posicao_vert: row.posicao_vert ?? null,
      validation_status: 'draft',
    }
    const { error } = await hf.from('product_vehicle_compatibility').upsert(payload, {
      onConflict: 'product_id,vehicle_version_id',
    })
    if (!error) stats.pvc_upsert += 1
  }

  // 8 images + storage
  const sourceImages = await fetchAll(
    source,
    'product_images',
    'id, product_id, storage_path, alt, sort_order, is_primary',
  )
  for (const img of sourceImages) {
    const hfPid = productIdMap.get(img.product_id)
    if (!hfPid) continue
    try {
      const { data: blob, error: dlErr } = await source.storage
        .from('product-images')
        .download(img.storage_path)
      if (dlErr || !blob) {
        stats.image_errors += 1
        continue
      }
      const path =
        hfPid === img.product_id
          ? img.storage_path
          : `${hfPid}/${img.storage_path.split('/').pop()}`
      const { error: upErr } = await hf.storage.from('product-images').upload(path, blob, {
        upsert: true,
        contentType: blob.type || 'image/jpeg',
      })
      if (upErr) {
        stats.image_errors += 1
        continue
      }
      const { error: rowErr } = await hf.from('product_images').upsert(
        {
          id: hfPid === img.product_id ? img.id : undefined,
          product_id: hfPid,
          storage_path: path,
          alt: img.alt,
          sort_order: img.sort_order ?? 0,
          is_primary: img.is_primary ?? false,
        },
        { onConflict: 'id' },
      )
      if (rowErr) {
        await hf.from('product_images').insert({
          product_id: hfPid,
          storage_path: path,
          alt: img.alt,
          sort_order: img.sort_order ?? 0,
          is_primary: img.is_primary ?? false,
        })
      }
      stats.images_copied += 1
    } catch {
      stats.image_errors += 1
    }
  }

  console.log('\nApply stats:')
  console.table(stats)
  console.log('\nSync apply concluído.\n')
}

main().catch((err) => {
  console.error(err)
  process.exitCode = 1
})
