import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { getAllProfiles, createUser, updateProfile, toggleUserActivo, deleteUser } from '@/services/users'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import { Spinner } from '@/components/ui/Spinner'
import { RoleBadge } from '@/components/ui/Badge'
import { Plus, ToggleLeft, ToggleRight, Trash2 } from 'lucide-react'
import type { UserRole } from '@/types'

interface NewUserForm { email: string; password: string; nombre: string; rol: UserRole }
const EMPTY_NEW: NewUserForm = { email: '', password: '', nombre: '', rol: 'mozo' }

export function AdminUsuarios() {
  const queryClient = useQueryClient()
  const [modalOpen, setModalOpen] = useState(false)
  const [form, setForm] = useState<NewUserForm>(EMPTY_NEW)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)

  const { data: profiles, isLoading } = useQuery({ queryKey: ['all-profiles'], queryFn: getAllProfiles })

  const handleSave = async () => {
    setError('')
    setSaving(true)
    try {
      await createUser(form.email, form.password, form.nombre, form.rol)
      queryClient.invalidateQueries({ queryKey: ['all-profiles'] })
      setModalOpen(false)
      setForm(EMPTY_NEW)
    } catch (e: any) {
      setError(e.message ?? 'Error al crear usuario')
    } finally {
      setSaving(false)
    }
  }

  const handleToggle = async (id: string, activo: boolean) => {
    await toggleUserActivo(id, !activo)
    queryClient.invalidateQueries({ queryKey: ['all-profiles'] })
  }

  const handleDelete = async () => {
    if (!confirmDelete) return
    setDeleting(true)
    try {
      await deleteUser(confirmDelete)
      queryClient.invalidateQueries({ queryKey: ['all-profiles'] })
      setConfirmDelete(null)
    } finally {
      setDeleting(false)
    }
  }

  if (isLoading) return <div className="flex justify-center py-20"><Spinner size="lg" /></div>

  return (
    <div className="animate-fade-in space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-2xl text-tierra-light mb-1">Usuarios</h1>
          <p className="text-tierra-muted text-sm">{profiles?.length ?? 0} en el sistema</p>
        </div>
        <Button onClick={() => setModalOpen(true)} size="md">
          <Plus size={16} className="mr-2" /> Nuevo usuario
        </Button>
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-tierra/10">
                {['Usuario', 'Rol', 'Estado', ''].map((h) => (
                  <th key={h} className="text-left px-5 py-3 text-tierra-muted text-xs uppercase tracking-wider font-body">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {profiles?.map((p) => (
                <tr key={p.id} className="border-b border-tierra/5 hover:bg-windsor-lighter/50 transition-colors">
                  <td className="px-5 py-4">
                    <div className="w-8 h-8 rounded-full bg-bronceado/20 flex items-center justify-center text-bronceado font-bold text-sm inline-flex mr-3">
                      {p.nombre[0]?.toUpperCase()}
                    </div>
                    <span className="text-tierra font-bold text-sm">{p.nombre}</span>
                  </td>
                  <td className="px-5 py-4"><RoleBadge rol={p.rol} /></td>
                  <td className="px-5 py-4">
                    <span className={`text-xs font-bold ${p.activo ? 'text-jade' : 'text-tierra-muted'}`}>
                      {p.activo ? 'Activo' : 'Inactivo'}
                    </span>
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <button onClick={() => handleToggle(p.id, p.activo)} className="text-tierra-muted">
                        {p.activo ? <ToggleRight size={22} className="text-jade" /> : <ToggleLeft size={22} />}
                      </button>
                      <button onClick={() => setConfirmDelete(p.id)} className="text-tierra-muted hover:text-rubi-light transition-colors">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <Modal open={!!confirmDelete} onClose={() => setConfirmDelete(null)} title="Eliminar usuario" size="sm">
        <div className="space-y-4">
          <p className="text-tierra-muted text-sm">
            Esta acción es <span className="text-rubi-light font-bold">irreversible</span>. El usuario perderá acceso inmediatamente y se borrarán sus datos de sesión.
          </p>
          <div className="flex gap-3">
            <Button variant="secondary" onClick={() => setConfirmDelete(null)} className="flex-1">Cancelar</Button>
            <Button variant="danger" onClick={handleDelete} loading={deleting} className="flex-1">Eliminar</Button>
          </div>
        </div>
      </Modal>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Nuevo usuario">
        <div className="space-y-4">
          <Input label="Nombre" value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} placeholder="Nombre completo" />
          <Input label="Email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="usuario@guayra.com" />
          <Input label="Contraseña" type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="Mínimo 6 caracteres" />
          <div className="flex flex-col gap-1.5">
            <label className="text-sm text-tierra-muted">Rol</label>
            <select value={form.rol} onChange={(e) => setForm({ ...form, rol: e.target.value as UserRole })} className="input-field">
              <option value="mozo">Mozo</option>
              <option value="cocina">Cocina</option>
              <option value="recepcion">Recepción</option>
              <option value="admin">Admin</option>
            </select>
          </div>
          {error && <p className="text-rubi-light text-sm bg-rubi/10 border border-rubi/20 rounded-xl px-4 py-3">{error}</p>}
          <div className="flex gap-3 pt-2">
            <Button variant="secondary" onClick={() => setModalOpen(false)} className="flex-1">Cancelar</Button>
            <Button onClick={handleSave} loading={saving} className="flex-1">Crear usuario</Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
