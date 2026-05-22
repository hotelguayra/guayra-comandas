import { supabase, supabaseAdmin } from '@/lib/supabase'
import type { Profile, UserRole } from '@/types'

export async function getAllProfiles(): Promise<Profile[]> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .order('nombre', { ascending: true })

  if (error) throw error
  return data as Profile[]
}

export async function createUser(
  email: string,
  password: string,
  nombre: string,
  rol: UserRole
): Promise<void> {
  const { data, error } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { nombre, rol },
  })
  if (error) throw error

  if (data.user) {
    const { error: profileError } = await supabase
      .from('profiles')
      .upsert({ id: data.user.id, nombre, rol, activo: true }, { onConflict: 'id' })

    if (profileError) throw profileError
  }
}

export async function updateProfile(id: string, data: Partial<Profile>): Promise<void> {
  const { error } = await supabase.from('profiles').update(data).eq('id', id)
  if (error) throw error
}

export async function toggleUserActivo(id: string, activo: boolean): Promise<void> {
  const { error } = await supabase.from('profiles').update({ activo }).eq('id', id)
  if (error) throw error
}

export async function deleteUser(id: string): Promise<void> {
  const { error } = await supabaseAdmin.auth.admin.deleteUser(id)
  if (error) throw error
}
