# La Cantina — Comunidad Deadlock LATAM

Stack: **Next.js 15** · **Tailwind CSS** · **Supabase** (PostgreSQL + Auth) · **Discord OAuth** · **Cloudflare Workers** (OpenNext)

---

## Setup paso a paso

### 1. Instalar dependencias

```bash
npm install
```

### 2. Crear proyecto en Supabase

1. Entrá a [supabase.com](https://supabase.com) y creá una cuenta / nuevo proyecto.
2. Anotá tu **Project URL** y **anon public key** (Settings → API).
3. Abrí **SQL Editor** y pegá el contenido de `supabase/setup.sql`. Ejecutalo — crea las tablas, RLS, el bucket `avatars` y el trigger de perfiles.
4. Después de loguearte por primera vez, hacete admin: `update profiles set is_admin = true where discord_username = 'TU_HANDLE';`

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
SUPABASE_SERVICE_ROLE_KEY=TU_SECRET_KEY        # Settings → API Keys → Secret key (solo server)
TWITCH_CLIENT_ID=TU_TWITCH_CLIENT_ID
TWITCH_CLIENT_SECRET=TU_TWITCH_CLIENT_SECRET
```

### 5. Correr en desarrollo

```bash
npm run dev
```

Abrí [http://localhost:3000](http://localhost:3000).

---

## Deploy en Cloudflare Workers

Se deploya con [OpenNext](https://opennext.js.org/cloudflare) (config en `wrangler.jsonc` y `open-next.config.ts`).

1. En el dashboard de Cloudflare: **Workers & Pages → Create → Import a repository** y elegí este repo.
   - **Project name:** `lacantina` (tiene que coincidir con `name` en `wrangler.jsonc`).
   - **Build command:** `npx opennextjs-cloudflare build`
   - **Deploy command:** `npx opennextjs-cloudflare deploy`
2. Variables — van en **dos lugares**:
   - **Settings → Build → Variables and secrets:** las `NEXT_PUBLIC_*` (se inyectan en el build).
   - **Settings → Variables and Secrets:** todas las del `.env.local` (runtime). `SUPABASE_SERVICE_ROLE_KEY` y las de Twitch como *Secret*.
3. En Supabase → **Authentication → URL Configuration**, agregá `https://lacantina.TU_SUBDOMINIO.workers.dev/**` (y tu dominio propio si tenés) a Redirect URLs.
4. Deploy automático con cada push a `main`.

Para probar el build de Workers localmente: `npm run preview`.

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
- **Dominio propio**: configurar en Cloudflare → Workers → lacantina → Settings → Domains & Routes.
