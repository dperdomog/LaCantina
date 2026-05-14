# La Cantina — Comunidad Deadlock LATAM

Stack: **Next.js 14** · **Tailwind CSS** · **Supabase** (PostgreSQL + Auth) · **Discord OAuth** · **Vercel**

---

## Setup paso a paso

### 1. Instalar dependencias

```bash
npm install
```

### 2. Crear proyecto en Supabase

1. Entrá a [supabase.com](https://supabase.com) y creá una cuenta / nuevo proyecto.
2. Anotá tu **Project URL** y **anon public key** (Settings → API).
3. Abrí **SQL Editor** y pegá el contenido de `lib/supabase/schema.sql`. Ejecutalo — crea las tablas, RLS y los torneos de ejemplo.

### 3. Configurar Discord OAuth en Supabase

1. En tu servidor de Discord: **Server Settings → Widget → Enable** (para obtener el invite link).
2. En [discord.com/developers](https://discord.com/developers/applications): creá una nueva aplicación.
   - Copiá el **Client ID** y generá un **Client Secret**.
   - En **OAuth2 → Redirects**, agregá: `https://TU_PROYECTO.supabase.co/auth/v1/callback`
3. En Supabase: **Authentication → Providers → Discord** → habilitalo y pegá el Client ID y Secret.

### 4. Configurar variables de entorno

Copiá `.env.example` a `.env.local` y completá los valores:

```bash
cp .env.example .env.local
```

```env
NEXT_PUBLIC_SUPABASE_URL=https://TU_PROYECTO.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=TU_ANON_KEY
NEXT_PUBLIC_SITE_URL=http://localhost:3000
NEXT_PUBLIC_DISCORD_INVITE=https://discord.gg/TU_INVITE
```

### 5. Correr en desarrollo

```bash
npm run dev
```

Abrí [http://localhost:3000](http://localhost:3000).

---

## Deploy en Vercel

1. Pusheá el repo a GitHub.
2. En [vercel.com](https://vercel.com): **New Project → Import** desde GitHub.
3. En **Environment Variables**, agregá las mismas del `.env.local` — pero con `NEXT_PUBLIC_SITE_URL` apuntando a tu dominio de Vercel (ej: `https://lacantina.vercel.app`).
4. En Discord Developer → OAuth2 → Redirects, agregá también: `https://TU_PROYECTO.supabase.co/auth/v1/callback` (si no lo hiciste antes).
5. Deploy automático con cada push a `main`.

---

## Estructura del proyecto

```
lacantina/
├── app/
│   ├── auth/callback/route.js   # Callback OAuth de Supabase
│   ├── globals.css              # Estilos globales + Tailwind
│   ├── layout.js                # Root layout (fuentes, metadata)
│   └── page.js                  # Página principal
├── components/
│   ├── Navbar.jsx
│   ├── Hero.jsx
│   ├── About.jsx
│   ├── Stats.jsx
│   ├── Torneos.jsx
│   ├── TorneoModal.jsx          # Modal de inscripción (guarda en Supabase)
│   ├── DiscordCTA.jsx           # Sección Discord + login OAuth
│   └── Footer.jsx
├── lib/
│   └── supabase/
│       ├── client.js            # Cliente Supabase (browser)
│       ├── server.js            # Cliente Supabase (server)
│       └── schema.sql           # Schema de base de datos
├── middleware.js                # Refresca sesión en cada request
├── .env.local                   # Variables de entorno (no commitear)
└── .env.example                 # Template de variables
```

---

## Próximos pasos sugeridos

- **Panel de admin**: página `/admin` para ver y gestionar inscripciones desde Supabase.
- **Bracket automático**: generar llaves de torneo en base a inscripciones confirmadas.
- **Perfil de usuario**: mostrar avatar e historial de torneos del jugador logueado.
- **Dominio propio**: configurar en Vercel → Settings → Domains.
