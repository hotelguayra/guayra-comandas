import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { LogOut } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { Modal } from './Modal'
import { Button } from './Button'
import { clsx } from 'clsx'

interface LogoutButtonProps {
  className?: string
  iconOnly?: boolean
}

export function LogoutButton({ className, iconOnly = false }: LogoutButtonProps) {
  const { signOut } = useAuth()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleConfirm = async () => {
    setLoading(true)
    await signOut()
    navigate('/login')
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className={clsx('flex items-center gap-3', className)}
      >
        <LogOut size={18} />
        {!iconOnly && 'Cerrar sesión'}
      </button>

      <Modal open={open} onClose={() => !loading && setOpen(false)} title="Cerrar sesión" size="sm" align="center">
        <div className="space-y-4">
          <p className="text-tierra text-sm">¿Seguro que querés cerrar la sesión?</p>
          <div className="flex gap-3 pt-1">
            <Button variant="secondary" onClick={() => setOpen(false)} className="flex-1" disabled={loading}>
              Cancelar
            </Button>
            <Button variant="danger" loading={loading} onClick={handleConfirm} className="flex-1">
              Cerrar sesión
            </Button>
          </div>
        </div>
      </Modal>
    </>
  )
}
