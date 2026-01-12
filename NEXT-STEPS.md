# Próximos Pasos para Deployment

## ✅ Lo que ya está listo

1. ✅ Rama `staging` creada y pusheada
2. ✅ Documentación completa en `DEPLOYMENT.md`
3. ✅ Archivo de configuración para Vercel (`vercel.json`)
4. ✅ Template de variables de entorno (`.env.example`)
5. ✅ Script de validación de variables
6. ✅ Scripts npm para deployment
7. ✅ `.gitignore` actualizado para proteger `.env`

## 📋 Checklist - Próximos Pasos

### 1. Crear Proyectos Supabase

- [ ] Crear proyecto de **staging** en Supabase
  - Nombre sugerido: `kitchen-ai-companion-staging`
  - Guardar: URL, anon key, service role key

- [ ] Crear proyecto de **producción** en Supabase
  - Nombre sugerido: `kitchen-ai-companion-prod`
  - Guardar: URL, anon key, service role key

### 2. Configurar Base de Datos (para cada proyecto)

```bash
# Conectar al proyecto staging
npx supabase link --project-ref [staging-project-ref]

# Aplicar migraciones
npx supabase db push

# Deployar todas las edge functions
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

# Repetir para el proyecto de producción
```

### 3. Configurar Secrets en Supabase (para cada proyecto)

```bash
# Gemini API Key
npx supabase secrets set GEMINI_API_KEY="tu-gemini-api-key"

# Stripe (usar TEST keys para staging, LIVE keys para prod)
npx supabase secrets set STRIPE_SECRET_KEY="sk_test_..."
npx supabase secrets set STRIPE_WEBHOOK_SECRET="whsec_test_..."

# Mercado Pago (usar TEST credentials para staging)
npx supabase secrets set MERCADOPAGO_ACCESS_TOKEN="TEST-..."

# Cron Secret (generar con: openssl rand -base64 32)
npx supabase secrets set CRON_SECRET="tu-secret-aleatorio"
```

### 4. Crear Productos en Stripe

#### Staging (Test Mode)
- [ ] Crear producto "Plan Semanal" - $4.99 USD cada 7 días
- [ ] Crear producto "Plan Mensual" - $14.99 USD cada 30 días
- [ ] Copiar Price IDs y actualizar en el código

#### Producción (Live Mode)
- [ ] Crear los mismos productos en modo Live
- [ ] Copiar Price IDs

### 5. Deploy a Vercel

- [ ] Ir a https://vercel.com/new
- [ ] Importar repositorio desde GitHub
- [ ] Configurar variables de entorno:
  - Para **Production** (rama main):
    - `VITE_SUPABASE_URL` = URL del proyecto prod
    - `VITE_SUPABASE_PUBLISHABLE_KEY` = Anon key prod
    - `VITE_SUPABASE_PROJECT_ID` = Project ID prod
  - Para **Preview** (rama staging):
    - `VITE_SUPABASE_URL` = URL del proyecto staging
    - `VITE_SUPABASE_PUBLISHABLE_KEY` = Anon key staging
    - `VITE_SUPABASE_PROJECT_ID` = Project ID staging

### 6. Configurar Webhooks

#### Stripe - Staging
- [ ] Crear webhook endpoint en Test Mode
  - URL: `https://[proyecto-staging].supabase.co/functions/v1/stripe-webhook`
  - Eventos: subscription + invoice events
  - Guardar webhook secret

#### Stripe - Producción
- [ ] Crear webhook endpoint en Live Mode
  - URL: `https://[proyecto-prod].supabase.co/functions/v1/stripe-webhook`
  - Eventos: los mismos que staging
  - Guardar webhook secret

### 7. Testing en Staging

Probar en el ambiente staging:
- [ ] Registro de usuario
- [ ] Login
- [ ] Generación de plan de comidas
- [ ] Proceso de pago con tarjeta de prueba Stripe
- [ ] Proceso de pago con Mercado Pago sandbox
- [ ] Verificar que webhooks funcionan
- [ ] Cancelación de suscripción
- [ ] Password reset
- [ ] Billing history

### 8. Deploy a Producción

Una vez todo probado:

```bash
git checkout main
git merge staging
git push origin main
```

## 🔧 Comandos Útiles

```bash
# Validar variables de entorno localmente
npm run validate-env

# Build local para verificar
npm run build

# Ver logs de edge functions
npx supabase functions logs [function-name] --project-ref [ref]

# Deploy solo a staging
npm run deploy:staging

# Deploy a producción
npm run deploy:prod
```

## 📚 Documentación Completa

Ver `DEPLOYMENT.md` para información detallada sobre:
- Variables de entorno completas
- Workflow de desarrollo
- Troubleshooting
- Seguridad
- Monitoreo

## ⚠️ Importante Antes de Lanzar

- [ ] Verificar que `.env` NO está en git (debe estar en `.gitignore`)
- [ ] Stripe en modo TEST hasta lanzamiento oficial
- [ ] Mercado Pago en credenciales de prueba hasta lanzamiento
- [ ] Todas las tablas de Supabase tienen RLS habilitado
- [ ] Testear exhaustivamente en staging antes de prod

## 🎯 Orden Recomendado

1. Crear proyectos Supabase (staging primero)
2. Configurar staging completamente
3. Testear todo en staging
4. Una vez confirmado, replicar a producción
5. Deploy final a Vercel

## 💡 Tips

- Usa el mismo .env local para desarrollo que staging
- Mantén credenciales de test/sandbox hasta estar listo para cobrar
- Documenta todos los Price IDs de Stripe en un lugar seguro
- Haz backups de la base de datos antes de cambios grandes
