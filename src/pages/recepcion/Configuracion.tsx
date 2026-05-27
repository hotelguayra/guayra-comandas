import { useState } from 'react'
import { Copy, Info, AlertCircle, CheckCircle } from 'lucide-react'
import { getPrintCopies, setPrintCopies } from '@/lib/print'

export function Configuracion() {
  const [copies, setCopiesState] = useState(getPrintCopies())
  const [saved, setSaved] = useState(false)

  const handleSave = () => {
    setPrintCopies(copies)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div className="max-w-xl animate-fade-in space-y-4">
      <div className="mb-6">
        <h2 className="font-heading text-2xl text-tierra-light mb-1">Configuración de impresión</h2>
        <p className="text-tierra-muted text-sm">Ajustes para los tickets de la impresora térmica</p>
      </div>

      {/* Copias */}
      <div className="card p-6 space-y-5">
        <div>
          <label className="block text-tierra text-sm font-bold mb-3">
            <Copy size={14} className="inline mr-1.5 mb-0.5" />
            Copias por ticket
          </label>
          <div className="flex gap-3">
            {[1, 2].map((n) => (
              <button
                key={n}
                onClick={() => setCopiesState(n)}
                className={`flex-1 py-3 rounded-xl border text-sm font-bold transition-all ${
                  copies === n
                    ? 'bg-bronceado/10 border-bronceado/40 text-bronceado'
                    : 'border-tierra/20 text-tierra-muted hover:border-tierra/40 hover:text-tierra'
                }`}
              >
                {n} {n === 1 ? 'copia' : 'copias'}
              </button>
            ))}
          </div>
        </div>

        <button
          onClick={handleSave}
          className="w-full py-3 rounded-xl bg-bronceado text-windsor font-bold text-sm transition-all hover:bg-bronceado-light active:scale-95"
        >
          {saved ? '¡Guardado!' : 'Guardar'}
        </button>
      </div>

      {/* Por qué aparece el diálogo */}
      <div className="card p-5">
        <div className="flex gap-3 mb-4">
          <AlertCircle size={16} className="text-tierra-muted flex-shrink-0 mt-0.5" />
          <p className="text-tierra-muted text-sm">
            <strong className="text-tierra">Chrome siempre muestra el diálogo de impresión</strong> — es una
            restricción del navegador que no se puede eliminar desde el código de la app.
            La única forma de saltearla es usar Chrome con el modo <strong className="text-tierra">kiosk-printing</strong>.
          </p>
        </div>
      </div>

      {/* Instrucciones kiosk-printing */}
      <div className="card p-5">
        <div className="flex gap-3">
          <Info size={16} className="text-bronceado flex-shrink-0 mt-0.5" />
          <div className="space-y-3 text-sm text-tierra-muted w-full">
            <p className="text-tierra font-bold">Cómo imprimir sin diálogo (modo kiosk)</p>

            <div className="space-y-2">
              <div className="flex gap-2">
                <CheckCircle size={14} className="text-jade flex-shrink-0 mt-0.5" />
                <p>Configurá la <strong className="text-tierra">Epson TM-T20III</strong> como impresora predeterminada de Windows:<br />
                  <span className="text-tierra-muted">Panel de control → Dispositivos e impresoras → clic derecho → Establecer como predeterminada</span>
                </p>
              </div>
              <div className="flex gap-2">
                <CheckCircle size={14} className="text-jade flex-shrink-0 mt-0.5" />
                <p>Creá un acceso directo de Chrome con este flag:</p>
              </div>
            </div>

            <div className="bg-windsor-card rounded-xl px-4 py-3 font-mono text-xs text-tierra break-all select-all">
              "C:\Program Files\Google\Chrome\Application\chrome.exe" --kiosk-printing
            </div>

            <p className="text-xs">
              Copiá esa ruta, creá un acceso directo en el escritorio, y usalo para abrir Chrome.
              Desde ese Chrome, al tocar <strong className="text-tierra">Imprimir ticket</strong> imprime directo
              sin ningún diálogo — y con 2 copias configuradas, salen los 2 tickets seguidos con corte automático.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
