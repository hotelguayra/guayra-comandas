import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { getAllMesas, createMesa, updateMesa, deleteMesa } from '@/services/tables'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import { Spinner } from '@/components/ui/Spinner'
import { Plus, Edit2, Trash2, ToggleLeft, ToggleRight } from 'lucide-react'
import type { Mesa } from '@/types'

interface FormState { numero: string; nombre: string; capacidad: string; activa: boolean }
const EMPTY: FormState = { numero: '', nombre: '', capacidad: '4', activa: true }

export function AdminMesas() {
  const queryClient = useQueryClient()
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Mesa | null>(null)
  const [form, setForm] = useState<FormState>(EMPTY)
  const [saving, setSaving] = useState(false)

  const { data: mesas, isLoading } = useQuery({ queryKey: ['all-mesas'], queryFn: getAllMesas })

  const openNew = () => { setEditing(null); setForm(EMPTY); setModalOpen(true) }
  const openEdit = (m: Mesa) => {
    setEditing(m)
    setForm({ numero: String(m.numero), nombre: m.nombre ?? '', capacidad: String(m.capacidad), activa: m.activa })
    setModalOpen(true)
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const payload = { numero: parseInt(form.numero), nombre: form.nombre || undefined, capacidad: parseInt(form.capacidad), activa: form.activa }
      if (editing) await updateMesa(editing.id, payload)
      else await createMesa(payload)
      queryClient.invalidateQueries({ queryKey: ['all-mesas'] })
      setModalOpen(false)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('¿Eliminar esta mesa?')) return
    await deleteMesa(id)
    queryClient.invalidateQueries({ queryKey: ['all-mesas'] })
  }

  const handleToggle = async (m: Mesa) => {
    await updateMesa(m.id, { activa: !m.activa })
    queryClient.invalidateQueries({ queryKey: ['all-mesas'] })
  }

  if (isLoading) return <div className="flex justify-center py-20"><Spinner size="lg" /></div>

  return (
    <div className="animate-fade-in space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-2xl text-tierra-light mb-1">Mesas</h1>
          <p className="text-tierra-muted text-sm">{mesas?.filter(m => m.activa).length ?? 0} activas de {mesas?.length ?? 0} total</p>
        </div>
        <Button onClick={openNew} size="md">
          <Plus size={16} className="mr-2" /> Nueva mesa
        </Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {mesas?.map((m) => (
          <div key={m.id} className={`card p-5 ${!m.activa ? 'opacity-50' : ''}`}>
            <div className="flex items-start justify-between mb-3">
              <span className="font-heading text-3xl text-tierra-light">{m.numero}</span>
              <button onClick={() => handleToggle(m)} className="text-tierra-muted">
                {m.activa ? <ToggleRight size={22} className="text-jade" /> : <ToggleLeft size={22} />}
              </button>
            </div>
            {m.nombre && <p className="text-tierra-muted text-sm mb-2">{m.nombre}</p>}
            <p className="text-tierra-muted text-xs mb-4">{m.capacidad} personas</p>
            <div className="flex gap-2">
              <button onClick={() => openEdit(m)} className="flex-1 py-2 rounded-xl bg-windsor-lighter hover:bg-windsor-lighter/80 text-tierra-muted text-xs transition-colors flex items-center justify-center gap-1">
                <Edit2 size={12} /> Editar
              </button>
              <button onClick={() => handleDelete(m.id)} className="p-2 rounded-xl hover:bg-rubi/10 text-tierra-muted hover:text-rubi-light transition-colors">
                <Trash2 size={14} />
              </button>
            </div>
          </div>
        ))}
      </div>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Editar mesa' : 'Nueva mesa'}>
        <div className="space-y-4">
          <Input label="Número de mesa" type="number" value={form.numero} onChange={(e) => setForm({ ...form, numero: e.target.value })} placeholder="1" />
          <Input label="Nombre (opcional)" value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} placeholder="Terraza, VIP..." />
          <Input label="Capacidad" type="number" value={form.capacidad} onChange={(e) => setForm({ ...form, capacidad: e.target.value })} placeholder="4" />
          <label className="flex items-center gap-3 cursor-pointer">
            <input type="checkbox" checked={form.activa} onChange={(e) => setForm({ ...form, activa: e.target.checked })} className="w-4 h-4 accent-bronceado" />
            <span className="text-tierra text-sm">Mesa activa</span>
          </label>
          <div className="flex gap-3 pt-2">
            <Button variant="secondary" onClick={() => setModalOpen(false)} className="flex-1">Cancelar</Button>
            <Button onClick={handleSave} loading={saving} className="flex-1">Guardar</Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
