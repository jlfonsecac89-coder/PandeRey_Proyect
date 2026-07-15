import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://cxhjthmgkzqpldkkdqkv.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

// Cliente público para usar en el Frontend (Cliente / Browser)
// Usa la anon key que respeta las políticas RLS de Supabase.
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Cliente administrativo privado para usar únicamente en el Backend (API / Servidor)
// Usa la service_role key que salta las políticas RLS (bypass RLS) para tareas operativas de negocio.
// ADVERTENCIA: Esta clave NUNCA debe estar expuesta en el frontend o iniciada con NEXT_PUBLIC_
export const getSupabaseAdmin = () => {
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!serviceRoleKey) {
        throw new Error('SUPABASE_SERVICE_ROLE_KEY is not defined in environment variables');
    }
    return createClient(supabaseUrl, serviceRoleKey, {
        auth: {
            persistSession: false,
            autoRefreshToken: false
        }
    });
};
