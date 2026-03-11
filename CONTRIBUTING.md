# Contribuir a Kitchen AI Companion

Gracias por tu interés en contribuir. Este documento explica cómo configurar el entorno, el flujo de trabajo y las convenciones del proyecto.

---

## Requisitos previos

- **Node.js** 18+
- **npm** 9+
- Cuenta en [Supabase](https://supabase.com) (para variables de entorno)
- Clave de API de [Google AI (Gemini)](https://aistudio.google.com)

---

## Setup inicial

```bash
# 1. Clonar el repositorio
git clone https://github.com/carlos0718/kitchen-ai-companion.git
cd kitchen-ai-companion

# 2. Instalar dependencias
npm install

# 3. Configurar variables de entorno
cp .env.example .env
# Editar .env con tus credenciales de Supabase
```

### Variables de entorno requeridas

| Variable | Descripción |
|---|---|
| `VITE_SUPABASE_URL` | URL del proyecto Supabase |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Clave anónima de Supabase |
| `VITE_SUPABASE_PROJECT_ID` | ID del proyecto Supabase |

Las edge functions requieren secrets en el dashboard de Supabase:

| Secret | Descripción |
|---|---|
| `GEMINI_API_KEY` | Google AI API key |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key (operaciones admin) |
| `MERCADOPAGO_ACCESS_TOKEN` | Token de producción de MercadoPago |

---

## Comandos disponibles

```bash
npm run dev        # Servidor de desarrollo (Vite)
npm run build      # Build de producción
npm run lint       # ESLint
npm run preview    # Preview del build de producción
```

### Edge Functions (Supabase)

```bash
# Deploy de una función específica
npx supabase functions deploy <nombre-función> --no-verify-jwt

# Deploy de todas las funciones
npx supabase functions deploy --no-verify-jwt
```

---

## Estructura del proyecto

```
src/
├── components/        # Componentes React reutilizables
│   └── ui/            # Componentes shadcn/ui
├── hooks/             # Custom hooks
├── pages/             # Páginas de la app
│   └── admin/         # Panel de administración
├── integrations/
│   └── supabase/      # Cliente y tipos de Supabase
└── lib/               # Utilidades

supabase/
├── functions/         # Edge Functions (Deno)
└── migrations/        # Migraciones SQL
```

---

## Flujo de trabajo

1. **Creá un issue** describiendo el bug o la mejora antes de empezar a trabajar
2. **Fork** el repositorio o creá una rama desde `main`:
   ```bash
   git checkout -b feat/nombre-descriptivo
   # o
   git checkout -b fix/nombre-del-bug
   ```
3. Hacé tus cambios siguiendo las convenciones del proyecto
4. **Corré el linter** antes de commitear: `npm run lint`
5. Abrí un **Pull Request** hacia `main` con una descripción clara

### Convenciones de commits

Seguimos [Conventional Commits](https://www.conventionalcommits.org/):

```
feat: agrega nueva funcionalidad
fix: corrige un bug
refactor: mejora el código sin cambiar funcionalidad
chore: cambios de configuración, dependencias
docs: cambios en documentación
```

---

## Convenciones de código

- **Idioma**: todo el texto visible al usuario va en **español**
- **Componentes**: PascalCase (`MealCard.tsx`)
- **Hooks**: camelCase con prefijo `use` (`useMealPlanner.ts`)
- **Estilos**: Tailwind CSS + variables CSS de shadcn/ui (no CSS inline salvo casos excepcionales)
- **Tipos**: TypeScript estricto, evitar `any`

---

## Reportar un bug

Usá el template de [Bug Report](https://github.com/carlos0718/kitchen-ai-companion/issues/new?template=bug_report.yml).

## Proponer una mejora

Usá el template de [Feature Request](https://github.com/carlos0718/kitchen-ai-companion/issues/new?template=feature_request.yml).
