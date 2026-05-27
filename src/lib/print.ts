const COPIES_KEY = 'print_copies'

export function getPrintCopies(): number {
  const v = parseInt(localStorage.getItem(COPIES_KEY) ?? '2', 10)
  return isNaN(v) || v < 1 ? 2 : v
}

export function setPrintCopies(copies: number) {
  localStorage.setItem(COPIES_KEY, String(copies))
}

// Imprime N veces seguidas usando onafterprint para encadenar automáticamente.
// Cada print job termina con el corte automático de la impresora térmica.
export function printWithCopies(copies?: number): void {
  const total = copies ?? getPrintCopies()
  let done = 0

  const next = () => {
    done++
    if (done < total) {
      const handler = () => {
        window.removeEventListener('afterprint', handler)
        setTimeout(next, 200)
      }
      window.addEventListener('afterprint', handler)
    }
    window.print()
  }

  next()
}
