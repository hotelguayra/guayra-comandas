import { useState } from 'react'
import { Modal } from './Modal'
import { supabase } from '@/lib/supabase'
import { Eye, EyeOff, LogOut, Mail, User } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'

interface Props {
  open: boolean
  onClose: () => void
}

export function UserProfileModal({ open, onClose }: Props) {
  const { profile, user, signOut } = useAuth()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  const handleClose = () => {
    setPassword(''); setConfirm(''); setError(''); setSuccess(false)
    onClose()
  }

  const handleSave = async () => {
    if (password.length < 6) return setError('Mínimo 6 caracteres.')
    if (password !== confirm) return setError('Las contraseñas no coinciden.')
    setSaving(true); setError('')
    const { error } = await supabase.auth.updateUser({ password })
    setSaving(false)
    if (error) return setError(error.message)
    setSuccess(true)
    setPassword(''); setConfirm('')
    setTimeout(() => setSuccess(false), 2500)
  }

  return (
    <Modal open={open} onClose={handleClose} title="Mi cuenta">
      <div className="space-y-5">

        {/* Info usuario */}
        <div className="rounded-xl bg-windsor-lighter border border-tierra/10 p-4 space-y-2">
          <div className="flex items-center gap-2 text-sm">
            <User size={14} className="text-tierra-muted flex-shrink-0" />
            <span className="text-tierra font-medium">{profile?.nombre}</span>
            <span className="ml-auto text-[11px] text-tierra-muted capitalize bg-bronceado/10 text-bronceado px-2 py-0.5 rounded-full">{profile?.rol}</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Mail size={14} className="text-tierra-muted flex-shrink-0" />
            <span className="text-tierra-muted text-xs">{user?.email}</span>
          </div>
        </div>

        {/* Cambiar contraseña */}
        <div className="space-y-3">
          <p className="text-xs font-bold uppercase tracking-widest text-tierra-muted">Cambiar contraseña</p>

          <div className="relative">
            <input
              type={showPass ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Nueva contraseña"
              className="input-field pr-10 w-full"
            />
            <button
              type="button"
              onClick={() => setShowPass(v => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-tierra-muted hover:text-windsor transition-colors"
            >
              {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>

          <input
            type="password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            placeholder="Confirmar contraseña"
            className="input-field w-full"
          />

          {error && <p className="text-rubi-light text-sm">{error}</p>}
          {success && <p className="text-jade text-sm">Contraseña actualizada.</p>}

          <button
            onClick={handleSave}
            disabled={saving || !password}
            className="w-full py-2.5 rounded-xl bg-bronceado text-windsor font-bold text-sm hover:bg-bronceado-light transition-all disabled:opacity-40"
          >
            {saving ? 'Guardando...' : 'Guardar contraseña'}
          </button>
        </div>

        {/* Cerrar sesión */}
        <button
          onClick={() => { handleClose(); signOut() }}
          className="w-full py-2.5 rounded-xl flex items-center justify-center gap-2 text-sm font-bold text-rubi-light hover:bg-rubi/10 border border-rubi/20 transition-colors"
        >
          <LogOut size={15} />
          Cerrar sesión
        </button>

      </div>
    </Modal>
  )
}
