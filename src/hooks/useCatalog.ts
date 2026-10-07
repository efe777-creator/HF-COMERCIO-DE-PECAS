import { listCategories } from '@/services/categories/categoryService'
import { listFeaturedProducts } from '@/services/products/productService'
import { searchCatalog } from '@/services/search/searchService'
import { getVehicleOptions } from '@/services/vehicles/vehicleService'
import type { Category, Product, VehicleOptionTree } from '@/types'
import { useEffect, useState } from 'react'

interface AsyncState<T> {
  data: T
  loading: boolean
  error: string | null
}

export function useCategories() {
  const [state, setState] = useState<AsyncState<Category[]>>({
    data: [],
    loading: true,
    error: null,
  })

  useEffect(() => {
    let active = true
    void (async () => {
      try {
        const data = await listCategories()
        if (active) setState({ data, loading: false, error: null })
      } catch (e) {
        if (active)
          setState({
            data: [],
            loading: false,
            error: e instanceof Error ? e.message : 'Erro ao carregar categorias',
          })
      }
    })()
    return () => {
      active = false
    }
  }, [])

  return state
}

export function useFeaturedProducts(limit = 8) {
  const [state, setState] = useState<AsyncState<Product[]>>({
    data: [],
    loading: true,
    error: null,
  })

  useEffect(() => {
    let active = true
    void (async () => {
      try {
        const data = await listFeaturedProducts(limit)
        if (active) setState({ data, loading: false, error: null })
      } catch (e) {
        if (active)
          setState({
            data: [],
            loading: false,
            error: e instanceof Error ? e.message : 'Erro ao carregar produtos',
          })
      }
    })()
    return () => {
      active = false
    }
  }, [limit])

  return state
}

export function useVehicleOptions() {
  const [state, setState] = useState<AsyncState<VehicleOptionTree | null>>({
    data: null,
    loading: true,
    error: null,
  })

  useEffect(() => {
    let active = true
    void (async () => {
      try {
        const data = await getVehicleOptions()
        if (active) setState({ data, loading: false, error: null })
      } catch (e) {
        if (active)
          setState({
            data: null,
            loading: false,
            error: e instanceof Error ? e.message : 'Erro ao carregar veículos',
          })
      }
    })()
    return () => {
      active = false
    }
  }, [])

  return state
}

export function useProductSearch(query: string) {
  const [state, setState] = useState<AsyncState<Product[]>>({
    data: [],
    loading: false,
    error: null,
  })

  useEffect(() => {
    const q = query.trim()
    if (!q) {
      setState({ data: [], loading: false, error: null })
      return
    }
    let active = true
    const timer = window.setTimeout(() => {
      void (async () => {
        setState((s) => ({ ...s, loading: true }))
        try {
          const result = await searchCatalog({ q, page: 1, pageSize: 8, sort: 'relevance' })
          if (active) setState({ data: result.items, loading: false, error: null })
        } catch (e) {
          if (active)
            setState({
              data: [],
              loading: false,
              error: e instanceof Error ? e.message : 'Erro na busca',
            })
        }
      })()
    }, 220)
    return () => {
      active = false
      window.clearTimeout(timer)
    }
  }, [query])

  return state
}
