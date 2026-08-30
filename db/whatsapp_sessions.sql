-- ============================================================
--  Script para crear la tabla de Sesiones de WhatsApp (Chatbot)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.whatsapp_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    phone_number TEXT NOT NULL UNIQUE,
    history JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Habilitar RLS (Row Level Security)
ALTER TABLE public.whatsapp_sessions ENABLE ROW LEVEL SECURITY;

-- Solo los administradores (y el backend a través del Service Role Key) pueden acceder a esto
CREATE POLICY "Permitir todo a administradores" ON public.whatsapp_sessions
    FOR ALL
    USING ( auth.uid() IN (SELECT id FROM public.profiles WHERE rol = 'admin') );

-- Comentarios
COMMENT ON TABLE public.whatsapp_sessions IS 'Guarda el historial de conversación (contexto) del bot de WhatsApp para cada número de teléfono.';
