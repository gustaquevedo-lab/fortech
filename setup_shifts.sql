-- Crear tabla de turnos
CREATE TABLE IF NOT EXISTS public.shifts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    guard_id UUID REFERENCES public.guards(id) ON DELETE CASCADE,
    post_id UUID REFERENCES public.posts(id) ON DELETE SET NULL,
    date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    status VARCHAR(50) DEFAULT 'SCHEDULED',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Habilitar RLS
ALTER TABLE public.shifts ENABLE ROW LEVEL SECURITY;

-- Crear políticas de acceso total (CRUD) para usuarios autenticados
CREATE POLICY "Permitir SELECCIONAR turnos" ON public.shifts FOR SELECT TO authenticated USING (true);
CREATE POLICY "Permitir INSERTAR turnos" ON public.shifts FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Permitir ACTUALIZAR turnos" ON public.shifts FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Permitir ELIMINAR turnos" ON public.shifts FOR DELETE TO authenticated USING (true);
