import { useState } from 'react'
import { Modal } from './Modal'
import { supabase } from '@/lib/supabase'
import { Eye, EyeOff } from 'lucide-react'

interface Props {
  open: boolean
  onClose: () => void
}

export function ChangePasswordModal({ open, onClose }: Props) {
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
    if (password.length < 6) return setError('La contraseña debe tener al menos 6 caracteres.')
    if (password !== confirm) return setError('Las contraseñas no coinciden.')
    setSaving(true); setError('')
    const { error } = await supabase.auth.updateUser({ password })
    setSaving(false)
    if (error) return setError(error.message)
    setSuccess(true)
    setTimeout(handleClose, 1500)
  }

  return (
    <Modal open={open} onClose={handleClose} title="Cambiar contraseña">
      <div className="space-y-4">
        <div className="flex flex-col gap-1.5">
          <label className="text-sm text-tierra-muted">Nueva contraseña</label>
          <div className="relative">
            <input
              type={showPass ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Mínimo 6 caracteres"
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
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-sm text-tierra-muted">Confirmar contraseña</label>
          <input
            type="password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            placeholder="Repetir contraseña"
            className="input-field"
          />
        </div>

        {error && <p className="text-rubi-light text-sm">{error}</p>}
        {success && <p className="text-jade text-sm">Contraseña actualizada.</p>}

        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full py-3 rounded-xl bg-bronceado text-windsor font-bold text-sm hover:bg-bronceado-light transition-all disabled:opacity-50"
        >
          {saving ? 'Guardando...' : 'Guardar'}
        </button>
      </div>
    </Modal>
  )
}
