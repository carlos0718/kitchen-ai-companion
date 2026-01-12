# Guía de Deployment - Kitchen AI Companion

## Estructura de Ambientes

- **Production (main)**: Ambiente de producción público
- **Staging/Testing (staging)**: Ambiente de pruebas para testing antes de producción

## Variables de Entorno Requeridas

### Frontend (Vercel)

Estas variables deben configurarse en Vercel Dashboard → Settings → Environment Variables

#### Producción (Production)
```
VITE_SUPABASE_URL=https://[tu-proyecto-prod].supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=[tu-anon-key-prod]
VITE_SUPABASE_PROJECT_ID=[tu-project-id-prod]
```

#### Testing/Staging (Preview)
```
VITE_SUPABASE_URL=https://[tu-proyecto-staging].supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=[tu-anon-key-staging]
VITE_SUPABASE_PROJECT_ID=[tu-project-id-staging]
```

### Backend (Supabase Edge Functions)

Estas variables deben configurarse en Supabase Dashboard → Settings → Secrets

#### Variables Automáticas (Supabase las proporciona)
- `SUPABASE_URL` - URL del proyecto Supabase
- `SUPABASE_ANON_KEY` - Key pública/anon key
- `SUPABASE_SERVICE_ROLE_KEY` - Key con permisos administrativos

#### Variables a Configurar Manualmente

##### Gemini AI (Generación de comidas)
```
GEMINI_API_KEY=[tu-api-key-de-google-gemini]
```
Obtener en: https://makersuite.google.com/app/apikey

##### Stripe (Pagos internacionales)
```
STRIPE_SECRET_KEY=[tu-stripe-secret-key]
STRIPE_WEBHOOK_SECRET=[tu-webhook-signing-secret]
```
Obtener en: https://dashboard.stripe.com/apikeys

**Nota para Testing:**
- Usa Stripe Test Mode keys (empiezan con `sk_test_` y `whsec_test_`)
- Para producción usa Live Mode keys (empiezan con `sk_live_` y `whsec_`)

##### Mercado Pago (Pagos Argentina)
```
MERCADOPAGO_ACCESS_TOKEN=[tu-mp-access-token]
```
Obtener en: https://www.mercadopago.com.ar/developers/panel/credentials

**Nota para Testing:**
- Usa credenciales de Testing
- Para producción usa credenciales de Producción

##### Cron Secret (Seguridad)
```
CRON_SECRET=[genera-un-string-aleatorio-seguro]
```
Genera un string seguro con: `openssl rand -base64 32`

## Pasos para Deployment

### 1. Crear Proyectos Supabase

#### Proyecto de Testing
1. Ve a https://supabase.com/dashboard
2. Crea un nuevo proyecto: `kitchen-ai-companion-staging`
3. Guarda las credenciales (URL, anon key, service role key)

#### Proyecto de Producción
1. Crea otro proyecto: `kitchen-ai-companion-prod`
2. Guarda las credenciales

### 2. Configurar Base de Datos

Para cada proyecto Supabase:

```bash
# Conectar a tu proyecto
npx supabase link --project-ref [tu-project-ref]

# Aplicar migraciones
npx supabase db push

# Deployar edge functions
npx supabase functions deploy check-subscription
npx supabase functions deploy create-checkout
npx supabase functions deploy customer-portal
npx supabase functions deploy stripe-webhook
npx supabase functions deploy mercadopago-create-preference
npx supabase functions deploy mercadopago-webhook
npx supabase functions deploy cancel-subscription
npx supabase functions deploy get-invoices --no-verify-jwt
npx supabase functions deploy detect-country
npx supabase functions deploy expire-subscriptions
npx supabase functions deploy generate-daily-meal
npx supabase functions deploy generate-weekly-meals
```

### 3. Configurar Secrets en Supabase

```bash
# Para cada edge function secret
npx supabase secrets set GEMINI_API_KEY=[value]
npx supabase secrets set STRIPE_SECRET_KEY=[value]
npx supabase secrets set STRIPE_WEBHOOK_SECRET=[value]
npx supabase secrets set MERCADOPAGO_ACCESS_TOKEN=[value]
npx supabase secrets set CRON_SECRET=[value]
```

### 4. Deploy a Vercel

#### Primera vez
1. Ve a https://vercel.com/new
2. Importa el repositorio desde GitHub
3. Configura las variables de entorno:
   - Production: Asigna a rama `main`
   - Preview: Asigna a rama `staging` (o todas las preview branches)

#### Framework Preset
- Framework: Vite
- Build Command: `npm run build`
- Output Directory: `dist`
- Install Command: `npm install`

#### Variables de Entorno en Vercel
1. Ve a Settings → Environment Variables
2. Agrega cada variable con su ambiente correspondiente:
   - ✅ Production (main)
   - ✅ Preview (staging + otras ramas)
   - ❌ Development (solo local)

### 5. Configurar Webhooks

#### Stripe Webhook
1. Ve a Stripe Dashboard → Developers → Webhooks
2. Crea un endpoint para Testing:
   - URL: `https://[proyecto-staging].supabase.co/functions/v1/stripe-webhook`
   - Eventos: `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.payment_succeeded`, `invoice.payment_failed`
3. Crea otro endpoint para Production:
   - URL: `https://[proyecto-prod].supabase.co/functions/v1/stripe-webhook`
   - Mismos eventos

#### Mercado Pago Webhook
El webhook se configura automáticamente al crear la preferencia de pago.
URL será: `https://[tu-proyecto].supabase.co/functions/v1/mercadopago-webhook`

### 6. Configurar Stripe Products

Para cada ambiente (Test y Live):
1. Ve a Stripe Dashboard → Products
2. Crea dos productos:
   - **Plan Semanal**: $4.99 USD, recurrente cada 7 días
   - **Plan Mensual**: $14.99 USD, recurrente cada 30 días
3. Copia los Price IDs
4. Actualiza `create-checkout/index.ts` con los Price IDs correspondientes:

```typescript
const PLAN_TO_PRICE: Record<string, string> = {
  weekly: "price_[tu-price-id-weekly]",
  monthly: "price_[tu-price-id-monthly]",
};
```

### 7. Testing del Ambiente Staging

Antes de hacer deploy a producción, verifica en staging:

- [ ] Login/Registro funciona
- [ ] Generación de planes con Gemini funciona
- [ ] Proceso de pago Stripe (modo test) funciona
- [ ] Proceso de pago Mercado Pago (sandbox) funciona
- [ ] Webhooks reciben eventos correctamente
- [ ] Cancelación de suscripción funciona
- [ ] Password reset funciona
- [ ] Billing history muestra facturas

### 8. Deploy a Producción

Una vez todo probado en staging:

```bash
git checkout main
git merge staging
git push origin main
```

Vercel automáticamente desplegará a producción.

## Workflow de Desarrollo

### Para nuevas features:
```bash
# Crear feature branch desde staging
git checkout staging
git checkout -b feature/nueva-funcionalidad

# Desarrollar y testear localmente
# ...

# Merge a staging para testing
git checkout staging
git merge feature/nueva-funcionalidad
git push origin staging

# Testear en ambiente staging
# Una vez confirmado que funciona...

# Merge a main para producción
git checkout main
git merge staging
git push origin main
```

### Para hotfixes urgentes:
```bash
# Crear hotfix branch desde main
git checkout main
git checkout -b hotfix/fix-critico

# Fix y merge directo a main
git checkout main
git merge hotfix/fix-critico
git push origin main

# Actualizar staging también
git checkout staging
git merge main
git push origin staging
```

## URLs de los Ambientes

### Testing/Staging
- Frontend: `https://[tu-app-staging].vercel.app`
- Backend: `https://[proyecto-staging].supabase.co`

### Producción
- Frontend: `https://[tu-app].vercel.app` (o tu dominio custom)
- Backend: `https://[proyecto-prod].supabase.co`

## Monitoreo

### Vercel
- Dashboard: https://vercel.com/dashboard
- Analytics: Ver tráfico y performance
- Logs: Ver logs de build y runtime

### Supabase
- Dashboard: https://supabase.com/dashboard
- Logs: Settings → Logs (API, Edge Functions, Realtime)
- Database: Ver queries y performance

### Stripe
- Dashboard: https://dashboard.stripe.com
- Webhooks: Ver eventos y deliveries
- Customers: Ver suscripciones activas

## Troubleshooting

### Edge Functions no responden
```bash
# Ver logs en tiempo real
npx supabase functions logs [function-name] --project-ref [ref]
```

### Variables de entorno no se aplican
- Vercel: Redeploy después de cambiar variables
- Supabase: Las secrets se aplican inmediatamente después de guardar

### Webhooks fallan
- Verifica que la URL del webhook sea correcta
- Verifica que el webhook secret sea correcto
- Revisa los logs en Stripe/MP Dashboard

## Seguridad

- ✅ Nunca commitear archivos `.env` al repositorio
- ✅ Usar diferentes credenciales para testing y producción
- ✅ Rotar secrets periódicamente
- ✅ Mantener Stripe en test mode hasta lanzamiento oficial
- ✅ Habilitar Row Level Security (RLS) en todas las tablas de Supabase
