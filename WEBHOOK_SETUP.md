# Guía de Configuración y Testing de Webhooks (Fase 1.4)

## Paso 1: Ejecutar la Migración de Base de Datos

```bash
npx supabase db push --include-all
```

Esto aplicará la migración `20251228_subscription_enhancements.sql` que crea:
- Campos adicionales en `user_subscriptions`
- Tabla `subscription_events` para auditoría
- Tabla `user_notifications` para notificaciones

## Paso 2: Desplegar la Edge Function

```bash
npx supabase functions deploy stripe-webhook
```

Esto desplegará la función que maneja los webhooks de Stripe.

## Paso 3: Configurar el Webhook Secret de Stripe

### Opción A: Para Testing Local con Stripe CLI

1. Instalar Stripe CLI si no lo tienes:
   ```bash
   # Windows (con Scoop)
   scoop install stripe

   # macOS (con Homebrew)
   brew install stripe/stripe-cli/stripe
   ```

2. Login a Stripe:
   ```bash
   stripe login
   ```

3. Configurar el webhook secret local:
   ```bash
   stripe listen --forward-to http://localhost:54321/functions/v1/stripe-webhook
   ```

   Esto mostrará un webhook secret que comienza con `whsec_...`. Cópialo.

4. Configurar el secret en Supabase (local):
   ```bash
   # Crear archivo .env.local si no existe
   echo "STRIPE_WEBHOOK_SECRET=whsec_..." >> .env.local
   ```

### Opción B: Para Producción (Stripe Dashboard)

1. Ir a [Stripe Dashboard > Developers > Webhooks](https://dashboard.stripe.com/webhooks)

2. Click en "Add endpoint"

3. Configurar el endpoint:
   - **URL**: `https://[TU-PROYECTO].supabase.co/functions/v1/stripe-webhook`
   - **Descripción**: "Kitchen AI Subscription Webhooks"
   - **Eventos a escuchar**:
     - `customer.subscription.created`
     - `customer.subscription.updated`
     - `customer.subscription.deleted`
     - `invoice.payment_succeeded`
     - `invoice.payment_failed`
     - `customer.subscription.trial_will_end`

4. Copiar el "Signing secret" (comienza con `whsec_...`)

5. Configurar en Supabase:
   ```bash
   npx supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_...
   ```

## Paso 4: Testing con Stripe CLI

### Test 1: Crear Suscripción

```bash
stripe trigger customer.subscription.created
```

**Verificar:**
- [ ] Se creó un registro en `subscription_events`
- [ ] Se actualizó `user_subscriptions` con el nuevo plan
- [ ] Se creó una notificación de bienvenida en `user_notifications`

### Test 2: Actualizar Suscripción

```bash
stripe trigger customer.subscription.updated
```

**Verificar:**
- [ ] Se actualizó el registro en `user_subscriptions`
- [ ] Se creó notificación si hubo cambio de plan o cancelación programada

### Test 3: Pago Exitoso

```bash
stripe trigger invoice.payment_succeeded
```

**Verificar:**
- [ ] Se actualizó `latest_invoice_id` en `user_subscriptions`
- [ ] Status se resetea a 'active' si estaba en 'past_due'
- [ ] Se creó notificación de renovación

### Test 4: Pago Fallido

```bash
stripe trigger invoice.payment_failed
```

**Verificar:**
- [ ] Status cambia a 'past_due' en `user_subscriptions`
- [ ] Se creó notificación de error con severity='error'

### Test 5: Trial Por Terminar

```bash
stripe trigger customer.subscription.trial_will_end
```

**Verificar:**
- [ ] Se creó notificación de advertencia con severity='warning'

### Test 6: Eliminar Suscripción

```bash
stripe trigger customer.subscription.deleted
```

**Verificar:**
- [ ] Plan cambia a 'free' y status a 'canceled'
- [ ] Se registra `canceled_at`
- [ ] Se creó notificación de cancelación

## Paso 5: Verificar Realtime Updates

1. Abrir la aplicación en el navegador
2. Abrir DevTools Console
3. Ejecutar alguno de los triggers anteriores
4. **Verificar:** En la consola debería aparecer `[REALTIME] Subscription changed:` seguido de los datos

## Paso 6: Verificar Logs

### Logs de la Edge Function:
```bash
npx supabase functions logs stripe-webhook
```

Deberías ver logs como:
```
[WEBHOOK] Received event: customer.subscription.created (evt_...)
[SUBSCRIPTION.CREATED] Processing subscription: sub_...
[NOTIFICATION] Created notification for user: ...
[EVENT] Logged event customer.subscription.created for event evt_...
```

### Verificar en Base de Datos:

```sql
-- Ver eventos registrados
SELECT * FROM subscription_events ORDER BY created_at DESC LIMIT 10;

-- Ver notificaciones creadas
SELECT * FROM user_notifications ORDER BY created_at DESC LIMIT 10;

-- Ver suscripciones actualizadas
SELECT * FROM user_subscriptions;
```

## Troubleshooting

### Error: "Invalid signature"
- **Causa**: El webhook secret no está configurado correctamente
- **Solución**: Verifica que `STRIPE_WEBHOOK_SECRET` esté configurado en Supabase

### Error: "No signature"
- **Causa**: La request no viene de Stripe
- **Solución**: Asegúrate de usar Stripe CLI o configurar el webhook en Stripe Dashboard

### Eventos duplicados
- **No es problema**: El sistema implementa idempotencia usando `stripe_event_id` único
- Los eventos duplicados se ignoran automáticamente

### No se crean notificaciones
- Verifica que el `user_id` se esté encontrando correctamente
- Revisa los logs con `npx supabase functions logs stripe-webhook`
- Verifica que exista un registro en `user_subscriptions` con el `stripe_customer_id`

## Métricas de Éxito

✅ **Latencia**: Updates en base de datos < 5 segundos después del evento
✅ **Idempotencia**: Eventos duplicados se ignoran sin errores
✅ **Notificaciones**: Se crean para todos los eventos importantes
✅ **Realtime**: UI se actualiza automáticamente sin recargar página
✅ **Logs**: Todos los eventos quedan registrados en `subscription_events`

## Próximos Pasos

Una vez completado el testing:
- [ ] Configurar webhook en producción (Stripe Dashboard)
- [ ] Eliminar polling si todo funciona correctamente
- [ ] Monitorear webhooks en Stripe Dashboard > Developers > Webhooks > View logs
