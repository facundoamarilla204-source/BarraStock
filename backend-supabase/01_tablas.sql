-- ==============================================================================
-- BarraStock - Fase 1: Creación de tablas de dispositivos y licencias
-- Ejecutar en el SQL Editor de Supabase
-- ==============================================================================

-- 1. Asegurar que tenemos una forma de vincular el Auth User con su Licencia
CREATE TABLE IF NOT EXISTS public.licencias (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    codigo TEXT UNIQUE NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT,
    fecha_vencimiento TIMESTAMP WITH TIME ZONE,
    estado TEXT DEFAULT 'activa',
    limite_dispositivos INT DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Crear tabla de dispositivos activos
CREATE TABLE IF NOT EXISTS public.dispositivos_activos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    machine_id TEXT NOT NULL,
    nombre_equipo TEXT,
    ultimo_acceso TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    estado TEXT DEFAULT 'activo', -- 'activo' o 'revocado'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, machine_id)
);

-- 3. Habilitar Seguridad por Nivel de Filas (RLS)
ALTER TABLE public.dispositivos_activos ENABLE ROW LEVEL SECURITY;

-- 4. Políticas de Seguridad (Los usuarios solo pueden ver y editar sus propios dispositivos)
CREATE POLICY "Los usuarios pueden ver sus propios dispositivos" 
ON public.dispositivos_activos FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Los usuarios pueden revocar sus dispositivos" 
ON public.dispositivos_activos FOR UPDATE 
USING (auth.uid() = user_id);
