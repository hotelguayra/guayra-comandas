import { useState, useMemo } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { getAllProductos, getAllCategorias, getSubcategorias, createProducto, updateProducto, deleteProducto } from '@/services/products'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import { Spinner } from '@/components/ui/Spinner'
import { Plus, Edit2, Trash2, ToggleLeft, ToggleRight, Search, X } from 'lucide-react'
import type { Producto } from '@/types'
import { clsx } from 'clsx'

interface FormState {
  nombre: string
  descripcion: string
  precio: string
  categoria_id: string
  subcategoria: string
  disponible: boolean
  panel: '' | 'cocina' | 'postres'
}

const EMPTY_FORM: FormState = { nombre: '', descripcion: '', precio: '', categoria_id: '', subcategoria: '', disponible: true, panel: '' }

export function AdminProductos() {
  const queryClient = useQueryClient()
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Producto | null>(null)
  const [form, setForm] = useState<FormState>(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [busqueda, setBusqueda] = useState('')
  const [categoriaFiltro, setCategoriaFiltro] = useState<string>('')

  const { data: productos, isLoading } = useQuery({
    queryKey: ['all-productos'],
    queryFn: getAllProductos,
  })

  const { data: categorias } = useQuery({
    queryKey: ['all-categorias'],
    queryFn: getAllCategorias,
  })

  const { data: subcategoriasDB = [] } = useQuery({
    queryKey: ['subcategorias'],
    queryFn: getSubcategorias,
  })

  const subcategoriasOpciones = useMemo(() => {
    if (!form.categoria_id) return [...new Set(subcategoriasDB.map(s => s.nombre))]
    const catNombre = (categorias?.find(c => c.id === form.categoria_id)?.nombre ?? '').toLowerCase()
    const filtradas = subcategoriasDB.filter(s => catNombre.includes(s.categoria_key))
    return filtradas.length > 0
      ? [...new Set(filtradas.map(s => s.nombre))]
      : [...new Set(subcategoriasDB.map(s => s.nombre))]
  }, [subcategoriasDB, form.categoria_id, categorias])

  const openNew = () => { setEditing(null); setForm(EMPTY_FORM); setModalOpen(true) }
  const openEdit = (p: Producto) => {
    setEditing(p)
    setForm({
      nombre: p.nombre,
      descripcion: p.descripcion ?? '',
      precio: String(p.precio),
      categoria_id: p.categoria_id ?? '',
      subcategoria: p.subcategoria ?? '',
      disponible: p.disponible,
      panel: (p.panel ?? '') as FormState['panel'],
    })
    setModalOpen(true)
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const payload = {
        nombre: form.nombre,
        descripcion: form.descripcion || undefined,
        precio: parseFloat(form.precio),
        categoria_id: form.categoria_id || undefined,
        subcategoria: form.subcategoria.trim() || undefined,
        disponible: form.disponible,
        panel: form.panel || null,
      }
      if (editing) {
        await updateProducto(editing.id, payload)
      } else {
        await createProducto(payload)
      }
      queryClient.invalidateQueries({ queryKey: ['all-productos'] })
      setModalOpen(false)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('¿Eliminar este producto?')) return
    await deleteProducto(id)
    queryClient.invalidateQueries({ queryKey: ['all-productos'] })
  }

  const handleToggle = async (p: Producto) => {
    await updateProducto(p.id, { disponible: !p.disponible })
    queryClient.invalidateQueries({ queryKey: ['all-productos'] })
  }

  const productosFiltrados = (productos ?? []).filter((p) => {
    const matchNombre = !busqueda.trim() || p.nombre.toLowerCase().includes(busqueda.toLowerCase())
    const matchCat = !categoriaFiltro || p.categoria_id === categoriaFiltro
    return matchNombre && matchCat
  })

  if (isLoading) return <div className="flex justify-center py-20"><Spinner size="lg" /></div>

  return (
    <div className="animate-fade-in space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-2xl text-tierra-light mb-1">Productos</h1>
          <p className="text-tierra-muted text-sm">{productosFiltrados.length} productos en el menú</p>
        </div>
        <Button onClick={openNew} size="md">
          <Plus size={16} className="mr-2" /> Nuevo producto
        </Button>
      </div>

      <div className="space-y-3">
        <div className="relative max-w-sm">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-tierra-muted pointer-events-none" />
          <input
            type="text"
            placeholder="Buscar producto..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            className="w-full bg-windsor-lighter border-2 border-tierra/15 rounded-xl pl-9 pr-9 py-2.5 text-sm text-tierra placeholder-tierra-muted focus:outline-none focus:border-bronceado/50 transition-colors"
          />
          {busqueda && (
            <button onClick={() => setBusqueda('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-tierra-muted hover:text-tierra">
              <X size={15} />
            </button>
          )}
        </div>

        {categorias && categorias.length > 0 && (
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => setCategoriaFiltro('')}
              className={clsx(
                'px-3 py-1 rounded-xl text-xs font-bold transition-colors',
                !categoriaFiltro
                  ? 'bg-bronceado text-windsor'
                  : 'bg-windsor-lighter text-tierra-muted hover:text-tierra'
              )}
            >
              Todas
            </button>
            {categorias.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setCategoriaFiltro(cat.id === categoriaFiltro ? '' : cat.id)}
                className={clsx(
                  'px-3 py-1 rounded-xl text-xs font-bold transition-colors',
                  categoriaFiltro === cat.id
                    ? 'bg-bronceado text-windsor'
                    : 'bg-windsor-lighter text-tierra-muted hover:text-tierra'
                )}
              >
                {cat.nombre}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-tierra/10">
                {['Nombre', 'Categoría', 'Subcategoría', 'Panel', 'Precio', 'Disponible', ''].map((h) => (
                  <th key={h} className="text-left px-5 py-3 text-tierra-muted text-xs uppercase tracking-wider font-body">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {productosFiltrados.map((p) => (
                <tr key={p.id} className="border-b border-tierra/5 hover:bg-windsor-lighter/50 transition-colors">
                  <td className="px-5 py-4">
                    <p className="text-tierra font-bold text-sm">{p.nombre}</p>
                    {p.descripcion && <p className="text-tierra-muted text-xs mt-0.5 truncate max-w-xs">{p.descripcion}</p>}
                  </td>
                  <td className="px-5 py-4 text-tierra-muted text-sm">{p.categoria?.nombre ?? '—'}</td>
                  <td className="px-5 py-4 text-tierra-muted text-sm">{p.subcategoria ?? '—'}</td>
                  <td className="px-5 py-4 text-sm">
                    {p.panel ? (
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-lg text-xs font-bold ${p.panel === 'cocina' ? 'bg-bronceado/10 text-bronceado' : 'bg-jade/10 text-jade'}`}>
                        {p.panel}
                      </span>
                    ) : (
                      <span className="text-tierra-muted text-xs">—</span>
                    )}
                  </td>
                  <td className="px-5 py-4 text-bronceado font-bold text-sm">
                    ${p.precio.toFixed(2)}
                  </td>
                  <td className="px-5 py-4">
                    <button onClick={() => handleToggle(p)} className="text-tierra-muted hover:text-tierra transition-colors">
                      {p.disponible
                        ? <ToggleRight size={22} className="text-jade" />
                        : <ToggleLeft size={22} />
                      }
                    </button>
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-2">
                      <button onClick={() => openEdit(p)} className="p-1.5 rounded-lg hover:bg-windsor-lighter text-tierra-muted hover:text-tierra transition-colors">
                        <Edit2 size={15} />
                      </button>
                      <button onClick={() => handleDelete(p.id)} className="p-1.5 rounded-lg hover:bg-rubi/10 text-tierra-muted hover:text-rubi-light transition-colors">
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Editar producto' : 'Nuevo producto'}>
        <div className="space-y-4">
          <Input label="Nombre" value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} placeholder="Nombre del producto" />
          <Input label="Descripción (opcional)" value={form.descripcion} onChange={(e) => setForm({ ...form, descripcion: e.target.value })} placeholder="Breve descripción" />
          <Input label="Precio" type="number" step="0.01" value={form.precio} onChange={(e) => setForm({ ...form, precio: e.target.value })} placeholder="0.00" />
          <div className="flex flex-col gap-1.5">
            <label className="text-sm text-tierra-muted">Categoría</label>
            <select
              value={form.categoria_id}
              onChange={(e) => setForm({ ...form, categoria_id: e.target.value })}
              className="input-field"
            >
              <option value="">Sin categoría</option>
              {categorias?.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
            </select>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-sm text-tierra-muted">Subcategoría (opcional)</label>
            <select
              value={form.subcategoria}
              onChange={(e) => setForm({ ...form, subcategoria: e.target.value })}
              className="input-field"
            >
              <option value="">Sin subcategoría</option>
              {subcategoriasOpciones.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-sm text-tierra-muted">Panel de envío</label>
            <select
              value={form.panel}
              onChange={(e) => setForm({ ...form, panel: e.target.value as FormState['panel'] })}
              className="input-field"
            >
              <option value="">Ninguno (pasa directo a listo)</option>
              <option value="cocina">Cocina</option>
              <option value="postres">Postres</option>
            </select>
          </div>
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={form.disponible}
              onChange={(e) => setForm({ ...form, disponible: e.target.checked })}
              className="w-4 h-4 accent-bronceado"
            />
            <span className="text-tierra text-sm">Disponible en el menú</span>
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
