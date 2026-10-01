-- Add user_id to licencias
ALTER TABLE public.licencias
ADD COLUMN user_id uuid REFERENCES auth.users(id);

-- Add limite_dispositivos to licencias
ALTER TABLE public.licencias
ADD COLUMN limite_dispositivos integer DEFAULT 1;

-- Create dispositivos_activos table
CREATE TABLE public.dispositivos_activos (
  id uuid DEFAULT extensions.uuid_generate_v4() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) NOT NULL,
  machine_id text NOT NULL,
  estado text DEFAULT 'activo' CHECK (estado IN ('activo', 'revocado')),
  ultimo_acceso timestamp with time zone DEFAULT now(),
  fecha_registro timestamp with time zone DEFAULT now()
);

-- RLS for dispositivos_activos (optional, depending on if you query from edge functions or clients directly)
ALTER TABLE public.dispositivos_activos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Los usuarios pueden ver sus propios dispositivos"
  ON public.dispositivos_activos
  FOR SELECT
  USING (auth.uid() = user_id);
