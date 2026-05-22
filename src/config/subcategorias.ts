// Orden de subcategorías por categoría — editar acá para cambiar el orden en la carta del mozo.
// La clave es un fragmento del nombre de la categoría (minúsculas).
export const SUBCATEGORIA_ORDER: [keyword: string, order: string[]][] = [
  ['tacc',      ['Principales', 'Merienda', 'Menú Infantil']],
  ['entrada',   ['Entradas', 'Ensaladas', 'Omelettes']],
  ['carne',     ['Carne Vacuna', 'Pollo', 'Pescado', 'Guarnición']],
  ['pasta',     ['Pastas', 'Salsas']],
  ['minuta',    ['Sandwiches', 'Pizzas']],
  ['bebida',    ['Sin Alcohol', 'Cervezas', 'Licuados']],
  ['postre',    ['Postres', 'Helados', 'Tortas']],
  ['vino',      ['Tintos', 'Blancos y Rosé', 'Espumantes']],
  ['aperitivo', ['Cocktails', 'Whisky', 'Vodka', 'Gin', 'Ron', 'Tequila', 'Licores y Cachaça']],
]

export const ALL_SUBCATEGORIAS = SUBCATEGORIA_ORDER.flatMap(([, order]) => order)

export function getSubcategoriaOrder(catNombre: string): string[] | null {
  const lower = catNombre.toLowerCase()
  for (const [keyword, order] of SUBCATEGORIA_ORDER) {
    if (lower.includes(keyword)) return order
  }
  return null
}
