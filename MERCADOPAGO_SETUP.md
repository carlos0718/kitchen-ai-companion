# Guía de Configuración: Integración de Mercado Pago

## Descripción General

Esta guía documenta la implementación del sistema de pagos dual que soporta tanto **Stripe** (usuarios internacionales) como **Mercado Pago** (usuarios argentinos).

### Características Principales

- ✅ Detección automática de país del usuario
- ✅ Precios dinámicos en ARS basados en cotización MEP del dólar en tiempo real
- ✅ Paridad de precios: ARS = USD × tasa MEP (4.99 USD → ~$5.700 ARS, 14.99 USD → ~$17.000 ARS)
- ✅ Precios en USD para usuarios internacionales ($4.99/semana, $14.99/mes)
- ✅ Pagos únicos por período (no recurrentes) para Mercado Pago
- ✅ Sistema de expiración automática
- ✅ Notificaciones pre-expiración (2 días antes)
- ✅ Banner de renovación en la interfaz

---

## Prerrequisitos

### 1. Cuenta de Mercado Pago

1. Crear cuenta en [https://www.mercadopago.com.ar](https://www.mercadopago.com.ar)
2. Activar modo sandbox para testing
3. Obtener credenciales:
   - **Access Token** (TEST y PRODUCTION)
   - **Public Key** (TEST y PRODUCTION)

### 2. Configurar Webhooks

**URL del webhook**: `https://[tu-proyecto].supabase.co/functions/v1/mercadopago-webhook`

**Configuración en panel de Mercado Pago**:
1. Ir a "Integraciones" → "Webhooks"
2. Agregar nueva URL de notificación
3. Seleccionar eventos:
   - `payment.created`
   - `payment.updated`
4. **IMPORTANTE**: La URL debe ser HTTPS (requisito desde marzo 2025)

---

## Instalación y Configuración

### Paso 1: Variables de Entorno

Agregar las siguientes variables al archivo `.env` local y a Supabase:

```bash
# Mercado Pago Configuration
MERCADOPAGO_ACCESS_TOKEN=TEST-xxxxx-xxxxx-xxxxx  # Para testing
MERCADOPAGO_PUBLIC_KEY=TEST-xxxxx-xxxxx-xxxxx    # Para testing

# Seguridad
MERCADOPAGO_WEBHOOK_SECRET=tu_secreto_webhook
CRON_SECRET=tu_secreto_cron_jobs
```

**Configurar en Supabase**:
```bash
# Ir a Project Settings → Edge Functions → Secrets
# Agregar cada variable de entorno
```

### Paso 2: Aplicar Migración de Base de Datos

```bash
# Aplicar la migración SQL
supabase db push
```

La migración agrega:
- Campo `payment_gateway` (stripe/mercadopago)
- Campos `mercadopago_payment_id` y `mercadopago_preference_id`
- Campo `is_recurring` (true para Stripe, false para MP)
- Campo `expiration_notified` para tracking de notificaciones
- Índices para optimizar búsquedas

### Paso 3: Deploy de Edge Functions

```bash
# Deploy todas las funciones nuevas
supabase functions deploy detect-country
supabase functions deploy get-exchange-rate
supabase functions deploy mercadopago-create-preference
supabase functions deploy mercadopago-webhook
supabase functions deploy mercadopago-check-payment
supabase functions deploy expire-subscriptions
supabase functions deploy notify-expiring-subscriptions

# Redeploy funciones modificadas
supabase functions deploy check-subscription
supabase functions deploy get-invoices
```

### Paso 4: Configurar Cron Jobs

En el panel de Supabase, configurar los siguientes cron jobs:

#### Expirar Suscripciones (cada hora)
```sql
SELECT cron.schedule(
  'expire-mercadopago-subscriptions',
  '0 * * * *',  -- Cada hora
  $$
  SELECT net.http_post(
    url := 'https://[tu-proyecto].supabase.co/functions/v1/expire-subscriptions',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || current_setting('app.settings.cron_secret')
    )
  );
  $$
);
```

#### Notificar Próximas Expiraciones (cada 12 horas)
```sql
SELECT cron.schedule(
  'notify-expiring-subscriptions',
  '0 */12 * * *',  -- Cada 12 horas
  $$
  SELECT net.http_post(
    url := 'https://[tu-proyecto].supabase.co/functions/v1/notify-expiring-subscriptions',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || current_setting('app.settings.cron_secret')
    )
  );
  $$
);
```

---

## Testing en Modo Sandbox

### Tarjetas de Prueba de Mercado Pago

**Para Argentina (ARS)**:

| Tarjeta | Número | Resultado |
|---------|---------|-----------|
| Visa Aprobada | `4509 9535 6623 3704` | ✅ Pago aprobado |
| Mastercard Aprobada | `5031 7557 3453 0604` | ✅ Pago aprobado |
| Visa Rechazada | `4509 9535 6623 3704` | ❌ Pago rechazado |
| Pendiente | `5031 7557 3453 0604` (nombre: CONT) | ⏳ Pago pendiente |

**Datos adicionales de prueba**:
- **CVV**: Cualquier 3 dígitos
- **Vencimiento**: Cualquier fecha futura
- **Titular**: `APRO` (aprobado), `OTHE` (rechazado), `CONT` (pendiente)

### Flujos de Testing

#### 1. Compra Semanal Exitosa
```
1. Usuario argentino abre /pricing
2. Detecta automáticamente ARS y Mercado Pago
3. Sistema obtiene tasa MEP actual (~1.150 ARS/USD)
4. Calcula precio: 4.99 USD × 1.150 = ~$5.740 ARS
5. Selecciona plan semanal
6. Redirige a Mercado Pago
7. Paga con tarjeta de prueba aprobada
8. Webhook procesa pago → status='active'
9. Usuario ve suscripción activa
```

#### 2. Compra Mensual Exitosa
```
Similar al flujo semanal, con precio calculado: 14.99 USD × tasa MEP
```

#### 3. Expiración Automática
```
1. Modificar manualmente current_period_end a fecha pasada
2. Esperar cron job (cada hora) o invocar manualmente
3. Verificar status cambia a 'canceled'
4. Verificar notificación creada
```

#### 4. Notificación Pre-Expiración
```
1. Modificar current_period_end a 2 días en el futuro
2. Esperar cron job (cada 12h) o invocar manualmente
3. Verificar notificación creada
4. Verificar expiration_notified=true
5. Verificar RenewalBanner aparece en UI
```

### Invocar Cron Jobs Manualmente (Testing)

```bash
# Expirar suscripciones
curl -X POST \
  https://[tu-proyecto].supabase.co/functions/v1/expire-subscriptions \
  -H "Authorization: Bearer $CRON_SECRET"

# Notificar expiraciones
curl -X POST \
  https://[tu-proyecto].supabase.co/functions/v1/notify-expiring-subscriptions \
  -H "Authorization: Bearer $CRON_SECRET"
```

---

## Arquitectura del Sistema

### Flujo de Compra (Mercado Pago)

```
Usuario → detect-country
  ↓ (gateway=mercadopago, currency=ARS)
Pricing Page → mercadopago-create-preference
  ↓ (preference_id, init_point)
Mercado Pago Checkout
  ↓ (pago aprobado)
Mercado Pago → mercadopago-webhook
  ↓ (payment.approved)
Actualizar DB → user_subscriptions
  ↓ (status=active, plan=weekly/monthly)
Notificar Usuario
```

### Sistema de Expiración

```
Cron Job (cada hora) → expire-subscriptions
  ↓
Buscar suscripciones expiradas:
  - payment_gateway = 'mercadopago'
  - status = 'active'
  - current_period_end < NOW()
  ↓
Para cada suscripción:
  - Actualizar status='canceled', plan='free'
  - Crear notificación al usuario
```

### Sistema de Notificaciones

```
Cron Job (cada 12h) → notify-expiring-subscriptions
  ↓
Buscar suscripciones por vencer:
  - payment_gateway = 'mercadopago'
  - status = 'active'
  - expiration_notified = false
  - current_period_end entre NOW()+1d y NOW()+2d
  ↓
Para cada suscripción:
  - Crear notificación de warning
  - Marcar expiration_notified=true
```

---

## Archivos Clave

### Edge Functions Nuevas

1. **`supabase/functions/get-exchange-rate/index.ts`**
   - Obtiene cotización MEP del dólar desde DolarAPI
   - Cache de 5 minutos para reducir llamadas a API
   - Fallback a 1.200 ARS si la API falla
   - Retorna tasa de venta (para conversión USD → ARS)

2. **`supabase/functions/detect-country/index.ts`**
   - Detecta país usando header `CF-IPCountry` de Cloudflare
   - Retorna gateway (stripe/mercadopago) y currency (USD/ARS)
   - Si es Argentina, incluye tasa de cambio MEP actual
   - Cachea preferencia en `user_profiles`

3. **`supabase/functions/mercadopago-create-preference/index.ts`**
   - Obtiene tasa MEP en tiempo real
   - Calcula precios: Math.round(USD × MEP)
   - Crea preferencia de pago en Mercado Pago
   - Guarda metadata: user_id, plan, period_start, period_end
   - Retorna URL para checkout

4. **`supabase/functions/mercadopago-webhook/index.ts`**
   - Procesa notificaciones IPN de Mercado Pago
   - Maneja eventos: approved, pending, rejected
   - Implementa idempotencia con `mercadopago_event_id`

5. **`supabase/functions/expire-subscriptions/index.ts`**
   - Cron job para expirar suscripciones vencidas
   - Se ejecuta cada hora
   - Requiere CRON_SECRET

6. **`supabase/functions/notify-expiring-subscriptions/index.ts`**
   - Cron job para notificar próximas expiraciones
   - Se ejecuta cada 12 horas
   - Notifica 2 días antes de vencer

### Edge Functions Modificadas

7. **`supabase/functions/check-subscription/index.ts`**
   - Agregada lógica para Mercado Pago
   - Auto-expira si período terminó
   - Retorna campos adicionales: payment_gateway, is_recurring, days_until_expiration

8. **`supabase/functions/get-invoices/index.ts`**
   - Crea facturas sintéticas para Mercado Pago
   - Mantiene compatibilidad con Stripe

### Componentes Frontend

9. **`src/hooks/useSubscription.ts`**
   - Nuevo: paymentGateway, isRecurring, daysUntilExpiration
   - createCheckout detecta gateway automáticamente
   - openCustomerPortal solo para Stripe

10. **`src/components/RenewalBanner.tsx`** (NUEVO)
   - Alert para suscripciones por vencer
   - Solo visible para MP no-recurrentes
   - Color rojo si <= 1 día, amarillo si <= 3 días

11. **`src/components/SubscriptionModal.tsx`**
    - Detecta país al abrir
    - Obtiene tasa MEP si es Argentina
    - Calcula precios dinámicamente: Math.round(USD × MEP)
    - Muestra precios en ARS o USD
    - Badge indicando pasarela de pago

12. **`src/pages/Pricing.tsx`**
    - Detecta país al cargar
    - Obtiene tasa MEP si es Argentina
    - Precios dinámicos calculados en tiempo real
    - Badge de pasarela de pago

### Base de Datos

13. **`supabase/migrations/20251229_mercadopago_integration.sql`**
    - Agrega campos para dual gateway
    - Crea índices de performance
    - Mantiene compatibilidad con datos existentes

---

## Actualizar Precios

### Precios Dinámicos (Sistema Actual)

Los precios en ARS se calculan **automáticamente** en tiempo real usando la fórmula:

```
Precio ARS = Math.round(Precio USD × Tasa MEP)
```

**Precios base en USD**:
- Semanal: **$4.99 USD**
- Mensual: **$14.99 USD**

**Ejemplo con tasa MEP de 1.150 ARS/USD**:
- Semanal: 4.99 × 1.150 = **$5.739 ARS** (redondeado)
- Mensual: 14.99 × 1.150 = **$17.239 ARS** (redondeado)

### Cambiar Precios Base en USD

Si deseas cambiar los precios base en dólares, debes actualizar:

1. **Frontend - SubscriptionModal**:
   ```typescript
   // src/components/SubscriptionModal.tsx - función getPricing()
   const weeklyARS = Math.round(4.99 * exchangeRate);  // Cambiar 4.99
   const monthlyARS = Math.round(14.99 * exchangeRate); // Cambiar 14.99
   ```

2. **Frontend - Pricing Page**:
   ```typescript
   // src/pages/Pricing.tsx - función getPricing()
   const weeklyARS = Math.round(4.99 * exchangeRate);  // Cambiar 4.99
   const monthlyARS = Math.round(14.99 * exchangeRate); // Cambiar 14.99
   ```

3. **Backend - Create Preference**:
   ```typescript
   // supabase/functions/mercadopago-create-preference/index.ts
   const weeklyPrice = Math.round(4.99 * exchangeRate);  // Cambiar 4.99
   const monthlyPrice = Math.round(14.99 * exchangeRate); // Cambiar 14.99
   ```

4. Redeploy:
   ```bash
   supabase functions deploy mercadopago-create-preference
   ```

### Fuente de Tasa de Cambio

La tasa MEP se obtiene de **DolarAPI** (https://dolarapi.com/v1/dolares/bolsa):
- **Actualización**: Cada 5 minutos (con cache)
- **Fallback**: 1.200 ARS/USD si la API falla
- **Tipo**: MEP (Mercado Electrónico de Pagos) - tasa "venta"

---

## Migración a Producción

### Checklist Pre-Producción

- [ ] Cambiar credenciales de TEST a PRODUCTION
- [ ] Configurar webhook en producción
- [ ] Verificar HTTPS en webhook URL
- [ ] Probar flujo completo con tarjeta real
- [ ] Verificar cron jobs funcionan
- [ ] Monitorear logs de edge functions
- [ ] Configurar alertas de errores

### Cambiar de TEST a PRODUCTION

```bash
# 1. Actualizar variables de entorno
MERCADOPAGO_ACCESS_TOKEN=APP-xxxxx-xxxxx-xxxxx  # Eliminar TEST-
MERCADOPAGO_PUBLIC_KEY=APP-xxxxx-xxxxx-xxxxx    # Eliminar TEST-

# 2. Actualizar en Supabase Secrets

# 3. Redeploy todas las funciones de MP
supabase functions deploy mercadopago-create-preference
supabase functions deploy mercadopago-webhook
```

---

## Troubleshooting

### Problema: Webhook no se ejecuta

**Solución**:
1. Verificar URL en panel de Mercado Pago
2. Verificar HTTPS (obligatorio)
3. Revisar logs: `supabase functions logs mercadopago-webhook`
4. Verificar firma de webhook en código

### Problema: Suscripción no expira automáticamente

**Solución**:
1. Verificar cron job está configurado
2. Invocar manualmente para testing
3. Revisar logs: `supabase functions logs expire-subscriptions`
4. Verificar CRON_SECRET está configurado

### Problema: Precios incorrectos

**Solución**:
1. Verificar variables de entorno en Supabase
2. Verificar hardcoded values en componentes frontend
3. Limpiar caché del navegador
4. Verificar logs de detect-country

### Problema: Usuario ve precios en USD siendo de Argentina

**Solución**:
1. Verificar header `CF-IPCountry` en requests
2. Forzar detección: eliminar registro de `user_profiles`
3. Verificar logs de detect-country
4. Probar con VPN de Argentina

---

## Monitoreo y Logs

### Ver logs de Edge Functions

```bash
# Logs generales
supabase functions logs

# Logs de función específica
supabase functions logs mercadopago-webhook
supabase functions logs expire-subscriptions

# Logs en tiempo real
supabase functions logs -f
```

### Métricas Clave a Monitorear

- **Tasa de conversión**: Preferences creadas vs pagos aprobados
- **Tasa de expiración**: Suscripciones expiradas sin renovación
- **Tiempo de respuesta de webhook**: < 22 segundos
- **Errores en cron jobs**: Revisar diariamente

---

## Soporte y Referencias

### Documentación Oficial

- [Mercado Pago Preferences API](https://www.mercadopago.com.ar/developers/es/docs/checkout-pro/overview)
- [Mercado Pago Webhooks](https://www.mercadopago.com.ar/developers/es/docs/your-integrations/notifications/webhooks)
- [Supabase Edge Functions](https://supabase.com/docs/guides/functions)
- [Supabase Cron Jobs](https://supabase.com/docs/guides/functions/schedule-functions)

### Contacto

Para problemas técnicos o preguntas sobre esta integración, contactar al equipo de desarrollo.

---

**Versión**: 1.0
**Fecha**: Diciembre 2025
**Autor**: Claude AI Assistant
