# Instalación de Edge Function y Preparación Final

Para que el Administrador pueda crear cuentas de usuarios (con Email, Rol y Contraseña Temporal) sin que Supabase corte su sesión activa, necesitamos instalar una función remota en Supabase conocida como "Edge Function". Además, vamos a añadir la columna en la base de datos para forzar contraseñas nuevas.

## Paso 1: Añadir columna a `user_roles`
En el panel web de Supabase -> "SQL Editor" de tu proyecto, ejecuta esto:

```sql
ALTER TABLE public.user_roles 
ADD COLUMN IF NOT EXISTS requires_password_change BOOLEAN DEFAULT true;
```

## Paso 2: Crear el Archivo de la Función
En tu computadora abre otra pestaña en la terminal (PowerShell o CMD) y colócate en la raíz del proyecto Fortech (`C:\Users\...\Fortech`). 

No corras `npm run dev` en esta terminal, solo usaremos la consola para instalar Supabase CLI.

1. Instala el CLI de Supabase globalmente mediante NPM:
`npm install -g supabase`

2. Autentícate en tu cuenta de Supabase desde la terminal (te abrirá el navegador):
`supabase login`

3. Vincula la terminal con tu proyecto remoto:
`supabase link --project-ref whnctoxdrtqhtwobknhn`
*(Ingresa tu contraseña de base de datos de Supabase si te la pide)*

4. Crea la estructura básica para la función `create_user`:
`supabase functions new create_user`

## Paso 3: Pegar el Código
Se ha creado un archivo en tu proyecto en `supabase/functions/create_user/index.ts`. Borra todo su contenido y pega EXACTAMENTE este código:

```typescript
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Manejo de CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    )

    // Verify caller is an ADMIN
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser()
    if (authError || !user) throw new Error("Unauthorized")

    const { data: roleData } = await supabaseClient.from('user_roles').select('role').eq('id', user.id).single()
    if (!roleData || roleData.role !== 'ADMIN') throw new Error("Solo los administradores pueden crear usuarios.")

    // Instanciate Admin client using Service Role to bypass creation limit
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Data from body
    const { email, password, role, client_id } = await req.json()

    // 1. Create Auth User
    const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true
    })
    if (createError) throw createError

    // 2. Insert Role
    const { error: insertError } = await supabaseAdmin.from('user_roles').insert({
      id: newUser.user.id,
      role: role,
      client_id: client_id,
      requires_password_change: true
    })
    
    if (insertError) throw insertError

    return new Response(JSON.stringify({ success: true, user: newUser.user }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})
```

## Paso 4: Desplegar la Función
Finalmente, de vuelta en la terminal, sube tu función a Supabase:

`supabase functions deploy create_user`

¡Listo! Con esto el Administrador ya podrá crear usuarios en la app, asignar su rol y la primera vez que el nuevo empleado o cliente entre, el sistema lo bloqueará en una pantalla obligatoria para modificar esa contraseña.
