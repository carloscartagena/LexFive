# Sistema de Gestión LexFive — Guía de configuración

Sistema de gestión de procesos judiciales y administrativos para el bufete LexFive.
Frontend estático (HTML/CSS/JS) + backend en **Supabase** (base de datos, login y archivos).

## ✅ Pasos para dejarlo funcionando (una sola vez)

### 1. Crear las tablas y reglas de seguridad
1. Entra a tu proyecto en **supabase.com**.
2. Menú lateral → **SQL Editor** → **New query**.
3. Abre el archivo `db/schema.sql` (de este repositorio), copia **todo** su contenido, pégalo y pulsa **Run**.
   - Esto crea las tablas (procesos, clientes, documentos, etc.), las reglas de acceso por rol y el "bucket" de almacenamiento para los memoriales.
4. Ejecuta, **en orden**, el resto de scripts de la carpeta `db/` (cada uno una sola vez):
   `02_portal_clientes.sql`, `03_blog_alertas_testimonios.sql`, `04_modelos_nurej.sql`,
   `05_multiples_abogados.sql`, `06_consultas.sql`, `07_sync_clientes.sql` y `08_categorias.sql`.
   - `06_consultas.sql` crea la tabla de la **bandeja "Consultas"**: cada mensaje del formulario
     de contacto de la web queda guardado y aparece en la pestaña **Consultas** del panel.
   - `07_sync_clientes.sql` hace que **cada persona que se registre como cliente** aparezca
     automáticamente en la pestaña **Clientes** (y agrega a los que ya se habían registrado).
   - `08_categorias.sql` habilita las **áreas del derecho dinámicas**: el personal puede crear
     categorías nuevas desde el panel y aparecen solas en Procesos y Modelos.

### 2. Ajustar el inicio de sesión por correo
En **Authentication → Providers → Email**, elige una de estas opciones:
- **Recomendado para uso interno:** desactiva *"Confirm email"* para que las cuentas funcionen al instante.
- O déjalo activado y confirma cada cuenta desde el correo.

### 3. Crear tu primer usuario (administrador)
Opción A — desde el sistema:
1. Abre `sistema/login.html` y pulsa **"Crear la primera cuenta"**.
2. Regístrate con tu nombre, correo y contraseña.

Opción B — desde Supabase:
1. **Authentication → Users → Add user** (correo + contraseña).

### 4. Convertirte en administrador
En **SQL Editor**, ejecuta (cambiando el correo por el tuyo):
```sql
update public.profiles set rol = 'admin' where email = 'alba23meira@gmail.com';
```

### 5. ¡Listo! Entra al sistema
Abre `sistema/login.html`, inicia sesión y ya tendrás acceso al panel completo.

---

## 👥 Cómo agregar a los demás abogados / procuradores
1. **Authentication → Users → Add user** en Supabase (o que se registren desde el login).
2. En el sistema, ve a **Usuarios** y asígnale el rol correcto (abogado / procurador / admin).

## 🔐 Roles y permisos
- **Administrador:** todo, incluyendo usuarios, auditoría y eliminación definitiva.
- **Procurador:** procesos, documentos, clientes y blog (no usuarios ni auditoría).
- **Abogado:** procesos, documentos, clientes y blog (no usuarios ni auditoría).
- Todos ven todos los procesos; todos pueden crear/editar procesos; solo el admin elimina.

## 📁 Estructura
```
sistema/
  login.html        Pantalla de acceso
  index.html        Panel (dashboard)
  css/panel.css     Estilos del sistema
  js/
    config.js       URL y clave pública de Supabase
    supabase.js     Cliente de Supabase
    auth.js         Sesión, roles y auditoría
    app.js          Lógica del panel (procesos, clientes, blog, usuarios...)
db/
  schema.sql                     Script base de la base de datos
  02_portal_clientes.sql         Rol "cliente" y aislamiento de datos
  03_blog_alertas_testimonios.sql Blog público, teléfono y testimonios
  04_modelos_nurej.sql           Biblioteca de modelos y campo NUREJ
  05_multiples_abogados.sql      Varios abogados/procuradores por proceso
  06_consultas.sql               Bandeja "Consultas" (formulario de contacto)
  07_sync_clientes.sql           Crea la ficha de cliente al registrarse (panel)
  08_categorias.sql              Áreas del derecho dinámicas (crear categorías)
```

## 📨 Bandeja de "Consultas"
- Los mensajes enviados desde el formulario de contacto de la web pública se guardan en la
  pestaña **Consultas** del panel (visible para todo el personal: admin, procurador y abogado).
- Cada consulta puede marcarse como **Atendida** o **Archivarse**, y se puede responder al
  cliente con un toque por **WhatsApp** o **correo**. Solo el administrador puede eliminarlas.
- Si además configuró la clave de Web3Forms, seguirá llegando una copia por correo.

## ⚠️ Notas de seguridad
- En `sistema/js/config.js` solo va la **clave pública** (segura para el navegador).
- La clave secreta (`service_role`) y la contraseña de la base **NUNCA** van en el sitio.
- La seguridad real la imponen las reglas RLS del archivo `schema.sql`.
