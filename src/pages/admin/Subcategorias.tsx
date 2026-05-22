import { useState, useMemo, useEffect } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  getAllCategorias,
  getSubcategorias,
  upsertSubcategorias,
  createSubcategoria,
  deleteSubcategoria,
} from '@/services/products'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import { Spinner } from '@/components/ui/Spinner'
import { ChevronUp, ChevronDown, Check, Plus, Trash2 } from 'lucide-react'
import type { Subcategoria } from '@/types'
import { clsx } from 'clsx'

interface FormState { nombre: string; categoria_key: string }
const EMPTY_FORM: FormState = { nombre: '', categoria_key: '' }

export function AdminSubcategorias() {
  const queryClient = useQueryClient()
  const [local, setLocal] = useState<Subcategoria[]>([])
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [form, setForm] = useState<FormState>(EMPTY_FORM)
  const [creating, setCreating] = useState(false)

  const { data, isLoading } = useQuery({
    queryKey: ['subcategorias'],
    queryFn: getSubcategorias,
  })

  const { data: categorias = [] } = useQuery({
    queryKey: ['all-categorias'],
    queryFn: getAllCategorias,
  })

  useEffect(() => {
    if (data) setLocal(data)
  }, [data])

  // Genera una clave sugerida a partir del nombre de la categoría seleccionada
  // La clave debe ser substring del nombre de categoría para que includes() funcione en NuevoPedido
  const keyFromCategoria = (nombre: string) =>
    nombre.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9\s]/g, '').trim()

  const handleSelectCategoria = (nombre: string) => {
    setForm(f => ({ ...f, categoria_key: keyFromCategoria(nombre) }))
  }

  const grouped = useMemo(() => {
    const keys = [...new Set(local.map(s => s.categoria_key))]
    return keys.map(key => ({
      key,
      items: local.filter(s => s.categoria_key === key).sort((a, b) => a.orden - b.orden),
    }))
  }, [local])

  function move(id: string, dir: -1 | 1) {
    setLocal(prev => {
      const catKey = prev.find(s => s.id === id)!.categoria_key
      const group = prev.filter(s => s.categoria_key === catKey).sort((a, b) => a.orden - b.orden)
      const idx = group.findIndex(s => s.id === id)
      const swapIdx = idx + dir
      if (swapIdx < 0 || swapIdx >= group.length) return prev
      const next = [...prev]
      const aIdx = next.findIndex(s => s.id === group[idx].id)
      const bIdx = next.findIndex(s => s.id === group[swapIdx].id)
      const aOrden = next[aIdx].orden
      next[aIdx] = { ...next[aIdx], orden: next[bIdx].orden }
      next[bIdx] = { ...next[bIdx], orden: aOrden }
      return next
    })
    setSaved(false)
  }

  const handleSaveOrder = async () => {
    setSaving(true)
    try {
      await upsertSubcategorias(local.map(s => ({ id: s.id, orden: s.orden })))
      queryClient.invalidateQueries({ queryKey: ['subcategorias'] })
      setSaved(true)
    } finally {
      setSaving(false)
    }
  }

  const handleCreate = async () => {
    if (!form.nombre.trim() || !form.categoria_key.trim()) return
    setCreating(true)
    try {
      const maxOrden = Math.max(0, ...local.filter(s => s.categoria_key === form.categoria_key).map(s => s.orden))
      await createSubcategoria(form.categoria_key.trim(), form.nombre.trim(), maxOrden + 1)
      queryClient.invalidateQueries({ queryKey: ['subcategorias'] })
      setModalOpen(false)
      setForm(EMPTY_FORM)
    } finally {
      setCreating(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('¿Eliminar esta subcategoría?')) return
    await deleteSubcategoria(id)
    queryClient.invalidateQueries({ queryKey: ['subcategorias'] })
  }

  if (isLoading) return <div className="flex justify-center py-20"><Spinner size="lg" /></div>

  return (
    <div className="animate-fade-in space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-2xl text-tierra-light mb-1">Subcategorías</h1>
          <p className="text-tierra-muted text-sm">Orden y grupos dentro de cada categoría en el menú del mozo</p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => { setForm(EMPTY_FORM); setModalOpen(true) }} size="md">
            <Plus size={16} className="mr-2" /> Nueva
          </Button>
          <Button onClick={handleSaveOrder} loading={saving} size="md">
            {saved && !saving ? <><Check size={16} className="mr-2" />Guardado</> : 'Guardar orden'}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {grouped.map(({ key, items }) => (
          <div key={key} className="card p-5">
            <h2 className="font-heading text-base text-rubi uppercase tracking-widest mb-4">
              {key}
            </h2>
            <div className="space-y-1.5">
              {items.map((sub, idx) => (
                <div
                  key={sub.id}
                  className="flex items-center gap-3 bg-windsor-lighter rounded-xl px-4 py-2.5"
                >
                  <span className="text-tierra-muted text-xs w-4 text-right flex-shrink-0">{idx + 1}</span>
                  <span className="text-tierra font-body font-bold text-sm flex-1">{sub.nombre}</span>
                  <div className="flex flex-col gap-0.5">
                    <button
                      onClick={() => move(sub.id, -1)}
                      disabled={idx === 0}
                      className="p-0.5 rounded text-tierra-muted hover:text-tierra disabled:opacity-20 transition-colors"
                    >
                      <ChevronUp size={16} />
                    </button>
                    <button
                      onClick={() => move(sub.id, 1)}
                      disabled={idx === items.length - 1}
                      className="p-0.5 rounded text-tierra-muted hover:text-tierra disabled:opacity-20 transition-colors"
                    >
                      <ChevronDown size={16} />
                    </button>
                  </div>
                  <button
                    onClick={() => handleDelete(sub.id)}
                    className="p-1 rounded-lg text-tierra-muted/40 hover:text-rubi-light hover:bg-rubi/10 transition-colors"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Nueva subcategoría" size="sm">
        <div className="space-y-4">
          <div>
            <label className="text-xs text-tierra-muted block mb-1">Categoría padre</label>
            <select
              className="input-field w-full"
              value=""
              onChange={e => e.target.value && handleSelectCategoria(e.target.value)}
            >
              <option value="">Seleccionar categoría...</option>
              {categorias.map(c => (
                <option key={c.id} value={c.nombre}>{c.nombre}</option>
              ))}
            </select>
          </div>
          <div>
            <Input
              label="Clave (grupo en DB)"
              value={form.categoria_key}
              onChange={e => setForm(f => ({ ...f, categoria_key: e.target.value }))}
              placeholder="ej: carnes, bebidas"
            />
            <p className="text-xs text-tierra-muted mt-1">
              Se auto-completa al elegir la categoría. Debe coincidir con subcategorías existentes del mismo grupo.
            </p>
          </div>
          <Input
            label="Nombre de la subcategoría"
            value={form.nombre}
            onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))}
            placeholder="ej: Minutas al paso, Pasta fresca..."
            autoFocus
          />
          <div className="flex gap-3 pt-2">
            <Button variant="secondary" onClick={() => setModalOpen(false)} className="flex-1">Cancelar</Button>
            <Button
              onClick={handleCreate}
              loading={creating}
              disabled={!form.nombre.trim() || !form.categoria_key.trim()}
              className="flex-1"
            >
              Crear
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
