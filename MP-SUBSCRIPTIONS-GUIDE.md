# Mercado Pago - Suscripciones Recurrentes

## ✅ Implementación Completada

Tu app ahora usa la **API de Suscripciones** de Mercado Pago en lugar de pagos únicos. Esto significa:

✅ **Renovación automática** cada 7 o 30 días
✅ **Cobro automático** sin que el usuario tenga que pagar de nuevo
✅ **Gestión de suscripciones** (pausar, cancelar, reactivar)
✅ **Funcionamiento similar a Stripe**

## 🔄 Diferencias vs Implementación Anterior

### Antes (Checkout Pro - Pagos Únicos):
```
Usuario paga $4990 por 7 días
→ Puede usar la app por 7 días
→ Al día 7, suscripción expira
→ Usuario debe pagar manualmente de nuevo
```

### Ahora (API de Suscripciones - Recurrente):
```
Usuario se suscribe por $4990/semana
→ MP cobra automáticamente cada 7 días
→ Suscripción se mantiene activa
→ Usuario puede cancelar cuando quiera
```

## 📁 Archivos Creados/Modificados

### Nuevas Edge Functions:

1. **`mercadopago-create-subscription/index.ts`** (NUEVO)
   - Crea suscripciones recurrentes usando Preapproval API
   - Reemplaza a `mercadopago-create-preference` (que sigue existiendo pero no se usa)

### Actualizados:

2. **`mercadopago-webhook/index.ts`** (ACTUALIZADO)
   - Ahora maneja eventos de suscripción además de pagos
   - Procesa: `subscription_preapproval`, `authorized`, `paused`, `cancelled`

3. **`src/hooks/useSubscription.ts`** (ACTUALIZADO)
   - Llama a `mercadopago-create-subscription` en lugar de `mercadopago-create-preference`

### Migraciones:

4. **`supabase/migrations/20260110_mercadopago_subscriptions.sql`** (NUEVO)
   - Agrega columna `mercadopago_subscription_id`
   - Índices para búsquedas rápidas

## 🚀 Deploy y Configuración

### 1. Aplicar Migraciones

```bash
# Aplicar migración de base de datos
npx supabase db push
```

### 2. Deploy Edge Functions

```bash
# Deploy la nueva función de suscripciones
npx supabase functions deploy mercadopago-create-subscription

# Deploy webhook actualizado
npx supabase functions deploy mercadopago-webhook

# Deploy detect-country (ya actualizado)
npx supabase functions deploy detect-country
```

### 3. Configurar Webhook en Mercado Pago

1. Ve a: https://www.mercadopago.com.ar/developers
2. Tu aplicación → **Webhooks**
3. Configura la URL: `https://[tu-proyecto].supabase.co/functions/v1/mercadopago-webhook`
4. Eventos a escuchar:
   - ✅ `payment` (para pagos)
   - ✅ `subscription_preapproval` (para suscripciones)

## 🧪 Probar Suscripciones

### Flujo de Testing:

1. **Crear Cuenta de Prueba**
   ```
   MP Developer → Usuarios de prueba → Crear usuario
   ```

2. **Iniciar Suscripción**
   ```
   1. En tu app local: npm run dev
   2. Ve a /pricing
   3. Click en "Suscribirse" (Plan Semanal o Mensual)
   4. Serás redirigido a MP
   5. Ingresa tarjeta de prueba:
      Número: 5031 7557 3453 0604
      CVV: 123
      Vencimiento: 11/25
      Titular: APRO
      DNI: 12345678
   6. Confirma la suscripción
   ```

3. **Verificar Activación**
   ```bash
   # Ver logs del webhook
   npx supabase functions logs mercadopago-webhook

   # Deberías ver:
   - "Processing subscription event"
   - "Subscription status: authorized"
   - "Subscription updated successfully"
   ```

4. **Verificar en Base de Datos**
   ```sql
   SELECT
     user_id,
     plan,
     status,
     subscribed,
     is_recurring,
     mercadopago_subscription_id,
     current_period_start,
     current_period_end
   FROM user_subscriptions
   WHERE payment_gateway = 'mercadopago';
   ```

   Deberías ver:
   - `subscribed`: true
   - `is_recurring`: true
   - `status`: active
   - `mercadopago_subscription_id`: (populated)

### Probar Renovación Automática

En MP sandbox, las renovaciones se aceleran para testing:
- Plan semanal: Se renueva cada ~10 minutos en lugar de 7 días
- Plan mensual: Se renueva cada ~1 hora en lugar de 30 días

Espera unos minutos y verifica que el webhook reciba el nuevo pago.

### Probar Cancelación

```
1. En tu app → Perfil → Suscripción
2. Click en "Cancelar suscripción"
3. Confirma
4. Webhook recibirá evento "subscription.cancelled"
5. Suscripción cambiará a status: canceled
6. Usuario ya no tiene acceso a features premium
```

## 📊 Eventos de Webhook

La API de Suscripciones envía estos eventos:

| Evento | Cuándo ocurre | Acción en tu app |
|--------|---------------|------------------|
| `subscription.authorized` | Suscripción creada y autorizada | Activar suscripción |
| `subscription.preapproval_plan.update` | Plan actualizado | Actualizar detalles |
| `subscription.paused` | Pago falló o usuario pausó | Marcar como past_due |
| `subscription.cancelled` | Usuario canceló | Cancelar suscripción |
| `payment` | Pago recurrente exitoso | Extender período |

## 🔍 Debugging

### Ver logs en tiempo real:

```bash
# Webhook
npx supabase functions logs mercadopago-webhook --project-ref [ref]

# Create subscription
npx supabase functions logs mercadopago-create-subscription --project-ref [ref]
```

### Logs importantes a buscar:

```
[MP-CREATE-SUBSCRIPTION] Subscription created: [subscription_id]
[MP-WEBHOOK] Processing subscription event
[MP-WEBHOOK] Subscription status: authorized
[MP-WEBHOOK] Subscription updated successfully
```

### Problemas comunes:

**❌ Webhook no recibe eventos**
- Verifica que la URL del webhook esté correcta en MP Developer
- Verifica que los eventos `subscription_preapproval` estén habilitados

**❌ Suscripción no se activa**
- Revisa logs del webhook
- Verifica que `external_reference` contenga el `user_id`
- Verifica que la migración se aplicó correctamente

**❌ Renovación no ocurre automáticamente**
- En sandbox, las renovaciones están aceleradas
- En producción, MP cobrará según la frecuencia configurada
- Verifica que la tarjeta tenga saldo suficiente

## 💰 Costos y Comisiones

Mercado Pago cobra por cada transacción (no por suscripción):

### Comisiones:
- Tarjeta de crédito: 3.99% + IVA por cada cobro
- Tarjeta de débito: 3.99% + IVA por cada cobro
- Sin cargo mensual de suscripción

### Ejemplo:
```
Plan Semanal: $4990
Comisión MP (3.99%): $199
Recibes: $4791
```

Cada 7 días se cobra automáticamente y recibes $4791.

## 📱 Gestión de Suscripciones

### Cancelar Suscripción (Desde tu App):

Ya implementado con el botón "Cancelar suscripción" que:
1. Llama a `cancel-subscription` edge function
2. MP cancela la suscripción
3. No se cobrarán más períodos
4. Usuario mantiene acceso hasta fin del período actual

### Cancelar Suscripción (Desde MP):

Usuario puede:
1. Ir a su cuenta de Mercado Pago
2. "Mis suscripciones"
3. Cancelar desde ahí
4. Tu webhook recibirá el evento y actualizará la DB

### Reactivar Suscripción:

Si un usuario cancela, para reactivar debe:
1. Volver a /pricing
2. Suscribirse de nuevo
3. Nueva suscripción se crea

No hay forma de "reactivar" una cancelada en MP.

## 🔐 Seguridad

### Validación de Webhooks:

Mercado Pago envía header `x-signature` para validar webhooks. Considera implementar verificación:

```typescript
const signature = req.headers.get("x-signature");
const xRequestId = req.headers.get("x-request-id");

// Validar firma usando tu webhook secret
// Documentación: https://www.mercadopago.com.ar/developers/es/docs/webhooks
```

### Idempotencia:

Ya implementado con `mercadopago_event_id` en `subscription_events`.

## 🌐 Producción

### Activar Cuenta:

Para usar en producción:
1. Completa datos fiscales (CUIT/CUIL)
2. Verifica identidad
3. Obtén credenciales PROD (APP-xxx)
4. Configura webhook en modo producción

### Credenciales:

```bash
# Staging (TEST)
npx supabase secrets set MERCADOPAGO_ACCESS_TOKEN="TEST-xxx..."

# Producción (APP)
npx supabase secrets set MERCADOPAGO_ACCESS_TOKEN="APP-xxx..."
```

### Testing en Producción:

Usa tus propias tarjetas reales con montos pequeños ($1) para verificar que todo funciona.

## 📚 Documentación MP

- **Preapproval API**: https://www.mercadopago.com.ar/developers/es/reference/subscriptions/_preapproval/post
- **Webhooks**: https://www.mercadopago.com.ar/developers/es/docs/subscriptions/integration-configuration/webhooks
- **Testing**: https://www.mercadopago.com.ar/developers/es/docs/subscriptions/integration-test

## ✅ Checklist de Deploy

- [ ] Migración aplicada (`npx supabase db push`)
- [ ] Edge functions deployed
- [ ] Webhook URL configurada en MP
- [ ] Eventos de suscripción habilitados
- [ ] Tested en sandbox con tarjeta de prueba
- [ ] Suscripción se activa correctamente
- [ ] Webhook procesa eventos correctamente
- [ ] Cancelación funciona
- [ ] Credenciales PROD obtenidas (cuando estés listo)

## 🎉 Próximos Pasos

1. **Testear completamente en local/staging**
2. **Verificar que webhooks funcionan**
3. **Activar cuenta MP para producción**
4. **Obtener credenciales PROD**
5. **Deploy a Vercel producción**
6. **¡Lanzamiento!**

---

**Nota:** La implementación anterior con `mercadopago-create-preference` sigue existiendo pero NO se usa. Considera eliminarla después de confirmar que todo funciona correctamente.
