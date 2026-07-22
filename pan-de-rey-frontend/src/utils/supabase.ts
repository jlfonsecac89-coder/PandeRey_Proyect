import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://cxhjthmgkzqpldkkdqkv.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'dummy-anon-key-to-prevent-build-errors';

// Cliente público para usar en el Frontend (Cliente / Browser)
// Usa la anon key que respeta las políticas RLS de Supabase.
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Cliente administrativo privado para usar únicamente en el Backend (API / Servidor)
// Usa la service_role key que salta las políticas RLS (bypass RLS) para tareas operativas de negocio.
export const getSupabaseAdmin = () => {
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'dummy-service-role-key-to-prevent-build-errors';
    return createClient(supabaseUrl, serviceRoleKey, {
        auth: {
            persistSession: false,
            autoRefreshToken: false
        }
    });
};
