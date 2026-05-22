import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { getAllCategorias, createCategoria, updateCategoria, deleteCategoria } from '@/services/products'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import { Spinner } from '@/components/ui/Spinner'
import { Plus, Edit2, Trash2 } from 'lucide-react'
import type { Categoria } from '@/types'
import { clsx } from 'clsx'

interface FormState { nombre: string; descripcion: string; orden: string; fila: 1 | 2 }
const EMPTY: FormState = { nombre: '', descripcion: '', orden: '0', fila: 1 }

export function AdminCategorias() {
  const queryClient = useQueryClient()
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Categoria | null>(null)
  const [form, setForm] = useState<FormState>(EMPTY)
  const [saving, setSaving] = useState(false)

  const { data: categorias, isLoading } = useQuery({
    queryKey: ['all-categorias'],
    queryFn: getAllCategorias,
  })

  const openNew = () => { setEditing(null); setForm(EMPTY); setModalOpen(true) }
  const openEdit = (c: Categoria) => {
    setEditing(c)
    setForm({ nombre: c.nombre, descripcion: c.descripcion ?? '', orden: String(c.orden), fila: (c.fila === 2 ? 2 : 1) })
    setModalOpen(true)
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const payload = {
        nombre: form.nombre,
        descripcion: form.descripcion || undefined,
        orden: parseInt(form.orden) || 0,
        fila: form.fila,
      }
      if (editing) await updateCategoria(editing.id, payload)
      else await createCategoria(payload)
      queryClient.invalidateQueries({ queryKey: ['all-categorias'] })
      queryClient.invalidateQueries({ queryKey: ['categorias'] })
      setModalOpen(false)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('¿Eliminar esta categoría?')) return
    await deleteCategoria(id)
    queryClient.invalidateQueries({ queryKey: ['all-categorias'] })
    queryClient.invalidateQueries({ queryKey: ['categorias'] })
  }

  if (isLoading) return <div className="flex justify-center py-20"><Spinner size="lg" /></div>

  const fila1 = categorias?.filter(c => c.fila !== 2).sort((a, b) => a.orden - b.orden) ?? []
  const fila2 = categorias?.filter(c => c.fila === 2).sort((a, b) => a.orden - b.orden) ?? []

  return (
    <div className="animate-fade-in space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-2xl text-tierra-light mb-1">Categorías</h1>
          <p className="text-tierra-muted text-sm">{categorias?.length ?? 0} categorías · las filas controlan la disposición en el menú del mozo</p>
        </div>
        <Button onClick={openNew} size="md">
          <Plus size={16} className="mr-2" /> Nueva categoría
        </Button>
      </div>

      {[{ label: 'Fila 1', items: fila1 }, { label: 'Fila 2', items: fila2 }].map(({ label, items }) => (
        <div key={label}>
          <h2 className="font-heading text-xs text-tierra-muted uppercase tracking-widest mb-3">{label}</h2>
          {items.length === 0 ? (
            <p className="text-tierra-muted text-sm px-1">Sin categorías</p>
          ) : (
            <div className="space-y-2">
              {items.map((c) => (
                <div key={c.id} className="card px-5 py-4 flex items-center justify-between">
                  <div>
                    <p className="text-tierra font-bold">{c.nombre}</p>
                    {c.descripcion && <p className="text-tierra-muted text-sm mt-0.5">{c.descripcion}</p>}
                    <p className="text-tierra-muted text-xs mt-1">Orden: {c.orden} · Fila: {c.fila ?? 1}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => openEdit(c)} className="p-2 rounded-xl hover:bg-windsor-lighter text-tierra-muted transition-colors">
                      <Edit2 size={15} />
                    </button>
                    <button onClick={() => handleDelete(c.id)} className="p-2 rounded-xl hover:bg-rubi/10 text-tierra-muted hover:text-rubi-light transition-colors">
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ))}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Editar categoría' : 'Nueva categoría'}>
        <div className="space-y-4">
          <Input label="Nombre" value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} placeholder="Nombre de la categoría" />
          <Input label="Descripción (opcional)" value={form.descripcion} onChange={(e) => setForm({ ...form, descripcion: e.target.value })} placeholder="Descripción breve" />
          <Input label="Orden (izquierda a derecha dentro de la fila)" type="number" value={form.orden} onChange={(e) => setForm({ ...form, orden: e.target.value })} placeholder="0" />
          <div>
            <label className="text-xs text-tierra-muted block mb-2">Fila en el menú del mozo</label>
            <div className="flex gap-2">
              {([1, 2] as const).map((f) => (
                <button
                  key={f}
                  type="button"
                  onClick={() => setForm({ ...form, fila: f })}
                  className={clsx(
                    'flex-1 py-2.5 rounded-xl text-sm font-bold border transition-colors',
                    form.fila === f
                      ? 'bg-bronceado text-windsor border-bronceado'
                      : 'bg-windsor-lighter text-tierra-muted border-tierra/20 hover:text-tierra'
                  )}
                >
                  Fila {f}
                </button>
              ))}
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <Button variant="secondary" onClick={() => setModalOpen(false)} className="flex-1">Cancelar</Button>
            <Button onClick={handleSave} loading={saving} disabled={!form.nombre.trim()} className="flex-1">Guardar</Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
