import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { getSubcategorias } from '@/services/products'

export function useSubcategoriasMap(): Map<string, string[]> | null {
  const { data: subcategoriasDB = [] } = useQuery({
    queryKey: ['subcategorias'],
    queryFn: getSubcategorias,
  })

  return useMemo(() => {
    if (!subcategoriasDB.length) return null
    const map = new Map<string, string[]>()
    for (const s of [...subcategoriasDB].sort((a, b) => a.orden - b.orden)) {
      if (!map.has(s.categoria_key)) map.set(s.categoria_key, [])
      map.get(s.categoria_key)!.push(s.nombre)
    }
    return map
  }, [subcategoriasDB])
}
