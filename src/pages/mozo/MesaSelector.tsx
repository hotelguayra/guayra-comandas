import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { getMesas, abrirMesa } from '@/services/tables'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { useNotificaciones } from '@/contexts/NotificacionesContext'
import { Spinner } from '@/components/ui/Spinner'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import type { Mesa, CategoriaHab } from '@/types'
import { clsx } from 'clsx'
import { ChefHat } from 'lucide-react'

const CATEGORIAS: { key: CategoriaHab | 'TODOS'; label: string }[] = [
  { key: 'TODOS',  label: 'Todos'  },
  { key: 'DPTO',   label: 'Dptos'  },
  { key: 'CAB',    label: 'Cabañas'},
  { key: 'EST',    label: 'Estándar'},
  { key: 'SUP',    label: 'Superior'},
  { key: 'DLX',    label: 'Deluxe' },
  { key: 'AF',     label: 'Afuera' },
]

function MesaCard({
  mesa,
  userId,
  listo,
  onClick,
}: {
  mesa: Mesa
  userId: string
  listo: boolean
  onClick: () => void
}) {
  const libre  = mesa.estado === 'libre'
  const cuenta = mesa.estado === 'cuenta'
  const mia    = mesa.mozo_activo_id === userId
  const ajena  = !libre && !mia

  return (
    <button
      onClick={ajena ? undefined : onClick}
      disabled={ajena}
      className={clsx(
        'card p-4 w-full text-left transition-all duration-200 relative',
        'h-28 flex flex-col justify-between overflow-hidden',
        libre && !listo   && 'border-jade/60 hover:border-jade hover:shadow-glow active:scale-95',
        mia && listo      && 'border-bronceado hover:border-bronceado-light active:scale-95 animate-listo-bg',
        mia && !listo && !cuenta && 'border-bronceado bg-bronceado/5 hover:border-bronceado/80 active:scale-95',
        mia && !listo && cuenta  && 'border-rubi hover:border-rubi-light active:scale-95 animate-cuenta-bg',
        ajena && !cuenta  && 'opacity-40 cursor-not-allowed',
        ajena && cuenta   && 'border-rubi/60 opacity-60 cursor-not-allowed'
      )}
    >
      <span className={clsx(
        'absolute top-2.5 right-2.5 w-2 h-2 rounded-full flex-shrink-0',
        libre && !listo   && 'bg-jade',
        mia && listo      && 'bg-bronceado animate-pulse',
        mia && !listo && !cuenta && 'bg-bronceado animate-pulse',
        mia && !listo && cuenta  && 'bg-rubi animate-pulse',
        ajena             && 'bg-tierra-muted'
      )} />

      <p className={clsx(
        'font-heading text-lg leading-tight pr-5',
        libre             && 'text-tierra-light',
        mia && listo      && 'text-jade',
        mia && !listo && !cuenta && 'text-bronceado',
        mia && !listo && cuenta  && 'text-rubi-light',
        ajena             && 'text-tierra-muted'
      )}>
        {mesa.nombre}
      </p>

      <p className={clsx(
        'text-sm font-bold truncate',
        mesa.cliente ? 'text-tierra' : 'text-transparent select-none'
      )}>
        {mesa.cliente ?? '—'}
      </p>

      <p className={clsx('text-xs font-bold flex items-center gap-1',
        libre && !listo   && 'text-jade',
        mia && listo      && 'text-jade animate-pulse',
        mia && !listo && !cuenta && 'text-bronceado',
        mia && !listo && cuenta  && 'text-rubi-light',
        ajena             && 'text-tierra-muted'
      )}>
        {libre && !listo && 'Libre'}
        {mia && listo && <><ChefHat size={11} /> LISTO</>}
        {mia && !listo && !cuenta && 'Mi hab.'}
        {mia && !listo && cuenta  && '● CUENTA'}
        {ajena && ((mesa.mozo_activo as any)?.nombre ?? 'Ocupada')}
      </p>
    </button>
  )
}

export function MesaSelector() {
  const navigate    = useNavigate()
  const queryClient = useQueryClient()
  const { user }    = useAuth()
  const { mesasListas, acknowledge } = useNotificaciones()

  const [filtro,        setFiltro]        = useState<CategoriaHab | 'TODOS'>('TODOS')
  const [modalOpen,     setModalOpen]     = useState(false)
  const [mesaSeleccion, setMesaSeleccion] = useState<Mesa | null>(null)
  const [cliente,       setCliente]       = useState('')
  const [abriendo,      setAbriendo]      = useState(false)

  const { data: mesas, isLoading, error } = useQuery({
    queryKey: ['mesas'],
    queryFn: getMesas,
    refetchInterval: 60000,
  })

  useEffect(() => {
    const channel = supabase
      .channel('mesa-selector-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'mesas' }, () => {
        queryClient.invalidateQueries({ queryKey: ['mesas'] })
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'pedido_panel_estados' }, () => {
        queryClient.invalidateQueries({ queryKey: ['mesas'] })
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [queryClient])

  const handleClick = (mesa: Mesa) => {
    if (!user) return
    if (mesa.estado === 'libre') {
      setMesaSeleccion(mesa)
      setCliente('')
      setModalOpen(true)
    } else if (mesa.mozo_activo_id === user.id) {
      acknowledge(mesa.id)
      navigate('/mozo/mis-pedidos', { state: { mesaId: mesa.id } })
    }
  }

  const handleConfirmar = async () => {
    if (!user || !mesaSeleccion) return
    setAbriendo(true)
    try {
      await abrirMesa(mesaSeleccion.id, user.id, cliente)
      queryClient.invalidateQueries({ queryKey: ['mesas'] })
      setModalOpen(false)
      navigate(`/mozo/mesa/${mesaSeleccion.id}/nuevo-pedido`)
    } catch (e) {
      console.error('Error al abrir habitación:', e)
    } finally {
      setAbriendo(false)
    }
  }

  if (isLoading) return <div className="flex justify-center py-20"><Spinner size="lg" /></div>
  if (error)    return <div className="text-center py-20 text-rubi-light">Error al cargar</div>

  const filtradas = filtro === 'TODOS'
    ? mesas ?? []
    : mesas?.filter(m => m.categoria === filtro) ?? []

  const libres   = mesas?.filter(m => m.estado === 'libre').length ?? 0
  const mias     = mesas?.filter(m => m.mozo_activo_id === user?.id).length ?? 0
  const ajenas   = mesas?.filter(m => m.estado !== 'libre' && m.mozo_activo_id !== user?.id).length ?? 0
  const cuentas  = mesas?.filter(m => m.estado === 'cuenta' && m.mozo_activo_id === user?.id).length ?? 0

  return (
    <div className="animate-fade-in">
      <div className="mb-5">
        <h2 className="font-heading text-2xl text-tierra-light mb-1">Habitaciones</h2>
        <div className="flex items-center gap-4 text-xs">
          <span className="flex items-center gap-1.5 text-jade">
            <span className="w-2 h-2 rounded-full bg-jade inline-block" />{libres} libre{libres !== 1 ? 's' : ''}
          </span>
          <span className="flex items-center gap-1.5 text-bronceado">
            <span className="w-2 h-2 rounded-full bg-bronceado inline-block" />{mias} mía{mias !== 1 ? 's' : ''}
          </span>
          {ajenas > 0 && (
            <span className="flex items-center gap-1.5 text-tierra-muted">
              <span className="w-2 h-2 rounded-full bg-tierra-muted inline-block" />{ajenas} ocupada{ajenas !== 1 ? 's' : ''}
            </span>
          )}
          {cuentas > 0 && (
            <span className="flex items-center gap-1.5 text-rubi-light">
              <span className="w-2 h-2 rounded-full bg-rubi inline-block" />{cuentas} cuenta{cuentas !== 1 ? 's' : ''}
            </span>
          )}
        </div>
      </div>

      <div className="flex gap-2 overflow-x-auto scrollbar-hide mb-5 pb-1">
        {CATEGORIAS.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setFiltro(key)}
            className={clsx(
              'flex-shrink-0 px-3 py-1.5 rounded-xl text-xs font-bold transition-colors',
              filtro === key
                ? 'bg-bronceado text-windsor'
                : 'bg-windsor-lighter text-tierra-muted hover:text-tierra'
            )}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-3">
        {filtradas.map((mesa) => (
          <MesaCard
            key={mesa.id}
            mesa={mesa}
            userId={user?.id ?? ''}
            listo={mesasListas.has(mesa.id)}
            onClick={() => handleClick(mesa)}
          />
        ))}
      </div>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={`Habitación ${mesaSeleccion?.nombre}`}
        size="sm"
        align="top"
      >
        <div className="space-y-5">
          <Input
            label="Apellido del cliente"
            placeholder="Ej: García"
            value={cliente}
            onChange={e => setCliente(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleConfirmar()}
            autoFocus
          />
          <div className="flex gap-3">
            <Button variant="secondary" onClick={() => setModalOpen(false)} className="flex-1">
              Cancelar
            </Button>
            <Button
              onClick={handleConfirmar}
              loading={abriendo}
              disabled={!cliente.trim()}
              className="flex-1"
            >
              Confirmar
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
