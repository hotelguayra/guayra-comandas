import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://tskhsgzaeboryyuksnld.supabase.co'
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRza2hzZ3phZWJvcnl5dWtzbmxkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3ODI1MDA5OCwiZXhwIjoyMDkzODI2MDk4fQ.0vuRyvYdy-0119PwQR3w-WuykWE84jTRH0WexeG0YUE'

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

async function getUserByEmail(email) {
  const { data, error } = await supabase.auth.admin.listUsers({ perPage: 1000 })
  if (error) throw error
  return data.users.find((u) => u.email === email) ?? null
}

async function main() {
  const EMAIL = 'recepcion@guayra.com'
  const PASSWORD = 'recepcion123'

  // ── Fase 1: crear usuario auth con rol transitorio 'mozo' ──────────────────
  // El trigger handle_new_user() crea el profile con el rol del metadata.
  // Usamos 'mozo' para pasar la constraint vieja; luego actualizamos a 'recepcion'.

  let userId

  const existing = await getUserByEmail(EMAIL)
  if (existing) {
    console.log(`⚠  Usuario ya existe (${existing.id}). Saltando creación.`)
    userId = existing.id
  } else {
    console.log('Creando usuario auth...')
    const { data, error } = await supabase.auth.admin.createUser({
      email: EMAIL,
      password: PASSWORD,
      email_confirm: true,
      user_metadata: { nombre: 'Recepción', rol: 'mozo' }, // temporal
    })
    if (error) {
      console.error('✗ Error al crear usuario:', error.message)
      process.exit(1)
    }
    userId = data.user.id
    console.log(`✓ Usuario creado: ${userId}`)
  }

  // Esperar al trigger
  await new Promise((r) => setTimeout(r, 1500))

  // ── Fase 2: actualizar profile a rol='recepcion' ───────────────────────────
  console.log('Actualizando rol a recepcion...')
  const { error: updateError } = await supabase
    .from('profiles')
    .update({ nombre: 'Recepción', rol: 'recepcion' })
    .eq('id', userId)

  if (updateError) {
    if (updateError.code === '23514') {
      // constraint violation → SQL no fue ejecutado todavía
      console.error('\n✗ La constraint de profiles todavía no incluye "recepcion".')
      console.error('  → Ejecutá primero el SQL en el Supabase dashboard y luego volvé a correr este script.')
      console.error('\n  El usuario auth SÍ fue creado. Cuando corras el script de nuevo')
      console.error('  solo actualizará el rol (no creará un usuario duplicado).\n')
    } else {
      console.error('✗ Error al actualizar perfil:', updateError.message, updateError.code)
    }
    process.exit(1)
  }

  // Verificar
  const { data: profile } = await supabase
    .from('profiles')
    .select('id, nombre, rol')
    .eq('id', userId)
    .single()

  console.log('\n╔══════════════════════════════╗')
  console.log('║   Usuario listo para usar    ║')
  console.log('╠══════════════════════════════╣')
  console.log(`║  Email:    ${EMAIL}  ║`)
  console.log(`║  Password: ${PASSWORD}           ║`)
  console.log(`║  Nombre:   ${profile?.nombre ?? '?'}             ║`)
  console.log(`║  Rol:      ${profile?.rol ?? '?'}          ║`)
  console.log('╚══════════════════════════════╝')
}

main()
