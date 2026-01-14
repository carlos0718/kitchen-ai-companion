# Configuración Mercado Pago - Guía Completa

## 1. Crear Cuenta en Mercado Pago Developer

### Paso 1: Acceder al Portal de Desarrolladores
1. Ve a: https://www.mercadopago.com.ar/developers
2. Inicia sesión con tu cuenta de Mercado Pago (o crea una si no tienes)
3. Acepta los términos y condiciones para desarrolladores

### Paso 2: Crear una Aplicación
1. Ve a: **"Tus integraciones"** → **"Crear aplicación"**
2. Completa los datos:
   - **Nombre**: Kitchen AI Companion (o el nombre de tu app)
   - **Descripción**: Asistente de cocina con IA
   - **Solución de pago**: **Checkout Pro** (recomendado)
   - **Modelo de integración**:
     - ✅ **Suscripciones** (para planes recurrentes)
     - ✅ **Pagos online** (para pagos únicos)

### Paso 3: Configurar Checkout
Según la imagen que compartiste, tienes 3 opciones:

#### **Checkout Pro** (Recomendado - Ya implementado)
- ✅ Experiencia prediseñada de Mercado Pago
- ✅ Tus clientes pagan en el ambiente de Mercado Pago
- ✅ Acepta tarjetas y otros medios de pago
- ❌ No acepta pagos recurrentes automáticos (pero sí suscripciones manuales)

#### Checkout Bricks
- Modular y flexible
- Requiere más desarrollo

#### Checkout API
- Experiencia 100% personalizable
- Mayor complejidad

**Para tu proyecto, Checkout Pro es suficiente.**

## 2. Obtener Credenciales

### Credenciales de Testing (Sandbox)

1. Ve a: **Tus integraciones** → Selecciona tu app → **Credenciales de prueba**
2. Encontrarás:
   ```
   Public Key (TEST): TEST-xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
   Access Token (TEST): TEST-xxxxxxxxxxxx-xxxxxx-xxxxxxxxxxxxxxx
   ```

3. **Guardar el Access Token de TEST** - Lo usarás para staging

### Credenciales de Producción

1. Ve a: **Credenciales de producción**
2. Mercado Pago te pedirá:
   - ✅ Activar tu cuenta
   - ✅ Completar información fiscal (CUIT/CUIL)
   - ✅ Verificar identidad

3. Una vez activada, obtendrás:
   ```
   Public Key (PROD): APP-xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
   Access Token (PROD): APP-xxxxxxxxxxxx-xxxxxx-xxxxxxxxxxxxxxx
   ```

## 3. Tipos de Checkout y Suscripciones

### Importante: Suscripciones en Mercado Pago

Mercado Pago maneja las suscripciones de forma diferente a Stripe:

#### Plan Semanal (7 días)
```json
{
  "reason": "Plan Semanal - Kitchen AI",
  "auto_recurring": {
    "frequency": 7,
    "frequency_type": "days",
    "transaction_amount": 4990, // en centavos (ARS)
    "currency_id": "ARS"
  },
  "back_url": "https://tuapp.com/subscription/success",
  "payer_email": "usuario@ejemplo.com"
}
```

#### Plan Mensual (30 días)
```json
{
  "reason": "Plan Mensual - Kitchen AI",
  "auto_recurring": {
    "frequency": 1,
    "frequency_type": "months",
    "transaction_amount": 14990,
    "currency_id": "ARS"
  }
}
```

### Pagos Internacionales

Mercado Pago acepta pagos internacionales en:
- 🇦🇷 Argentina (ARS)
- 🇧🇷 Brasil (BRL)
- 🇲🇽 México (MXN)
- 🇨🇴 Colombia (COP)
- 🇨🇱 Chile (CLP)
- 🇵🇪 Perú (PEN)
- 🇺🇾 Uruguay (UYU)

**Nota:** Para cada país necesitas credenciales específicas de ese país.

## 4. Configurar Webhooks (IPN)

### Paso 1: Configurar URL de Notificaciones
1. Ve a tu aplicación en el panel de MP
2. **Notificaciones** → **Webhook**
3. Configura la URL:
   - **Testing**: `https://[tu-proyecto-staging].supabase.co/functions/v1/mercadopago-webhook`
   - **Producción**: `https://[tu-proyecto-prod].supabase.co/functions/v1/mercadopago-webhook`

### Paso 2: Seleccionar Eventos
Marca estos eventos:
- ✅ `payment` - Cuando se procesa un pago
- ✅ `subscription` - Actualizaciones de suscripciones (si usas subscriptions API)

## 5. Usuarios de Prueba

Para testing necesitas crear usuarios de prueba:

### Crear Usuario de Prueba
1. Ve a: **Usuarios de prueba**
2. Click en **"Crear usuario de prueba"**
3. Completa:
   - País: Argentina
   - Cantidad de dinero: 10000 (saldo ficticio)

Obtendrás:
```
Email: test_user_xxxxx@testuser.com
Password: qatest1234
```

### Tarjetas de Prueba

Para testing usa estas tarjetas:

**Tarjeta Aprobada:**
```
Número: 5031 7557 3453 0604
CVV: 123
Fecha: 11/25
Titular: APRO (Approved)
DNI: 12345678
```

**Tarjeta Rechazada:**
```
Número: 5031 4332 1540 6351
CVV: 123
Fecha: 11/25
Titular: OTROC (Other reason)
DNI: 12345678
```

Más tarjetas: https://www.mercadopago.com.ar/developers/es/docs/checkout-pro/additional-content/test-cards

## 6. Configuración en Tu Proyecto

### Variables de Entorno

#### Staging (Supabase Secrets)
```bash
npx supabase secrets set MERCADOPAGO_ACCESS_TOKEN="TEST-xxxxx..."
```

#### Producción (Supabase Secrets)
```bash
npx supabase secrets set MERCADOPAGO_ACCESS_TOKEN="APP-xxxxx..."
```

### Frontend (Vercel)
No necesitas agregar nada en el frontend para Mercado Pago. Todo se maneja desde el backend.

## 7. Flujo de Pago Actual

Tu código ya está implementado correctamente:

### Crear Preferencia de Pago
```typescript
// mercadopago-create-preference/index.ts
const preference = await mercadopago.preferences.create({
  items: [{
    title: `Plan ${plan} - Kitchen AI`,
    quantity: 1,
    currency_id: "ARS",
    unit_price: priceInPesos,
  }],
  back_urls: {
    success: `${supabaseUrl}/profile/subscription`,
    failure: `${supabaseUrl}/pricing`,
    pending: `${supabaseUrl}/profile/subscription`,
  },
  notification_url: `${supabaseUrl}/functions/v1/mercadopago-webhook`,
  metadata: {
    user_id: user.id,
    plan: plan,
  }
});

// Redirigir al usuario a:
return preference.init_point; // URL de checkout de MP
```

### Webhook Recibe Notificación
```typescript
// mercadopago-webhook/index.ts
// MP envía notificación cuando el pago se completa
// Tu webhook procesa y actualiza la suscripción en la DB
```

## 8. Testing en Sandbox

### Checklist de Testing

- [ ] Crear preferencia de pago desde tu app
- [ ] Redirigir a Checkout Pro de MP
- [ ] Pagar con tarjeta de prueba (APRO)
- [ ] Verificar que webhook recibe la notificación
- [ ] Verificar que la suscripción se activa en tu DB
- [ ] Verificar que el usuario puede acceder a features premium
- [ ] Probar con tarjeta rechazada (OTROC)
- [ ] Verificar manejo de errores

### Comandos para Ver Logs
```bash
# Ver logs del webhook
npx supabase functions logs mercadopago-webhook --project-ref [ref]

# Ver logs de create-preference
npx supabase functions logs mercadopago-create-preference --project-ref [ref]
```

## 9. Limitaciones vs Stripe

### ✅ Ventajas de Mercado Pago
- ✅ Acepta cuentas argentinas
- ✅ Comisiones más bajas en Argentina (3.99% + IVA)
- ✅ Pago en cuotas sin interés
- ✅ Integración simple

### ⚠️ Desventajas vs Stripe
- ❌ No tiene suscripciones automáticas tan robustas como Stripe
- ❌ Webhooks menos confiables (puede haber delays)
- ❌ No tiene customer portal como Stripe
- ❌ Limitado a países de Latinoamérica

### Solución para Suscripciones Recurrentes

Para manejar renovaciones:
1. **Opción A**: Usar Checkout Pro con preferencias de suscripción (requiere re-autorización)
2. **Opción B**: Crear pagos únicos y gestionar renovaciones manualmente
3. **Opción C**: Usar la API de Suscripciones de MP (más complejo)

**Tu implementación actual usa pagos únicos** (Opción B), lo cual está bien para MVP.

## 10. Activar Cuenta para Producción

### Requisitos
- ✅ Tener una cuenta de Mercado Pago personal
- ✅ Completar datos fiscales (CUIT/CUIL)
- ✅ Verificar identidad
- ✅ Aceptar términos comerciales

### Proceso
1. Ve a: **Mi cuenta** → **Configuración** → **Datos fiscales**
2. Completa todos los campos requeridos
3. Sube documentación si es necesario
4. Espera aprobación (puede tardar 24-48hs)
5. Una vez aprobado, podrás usar credenciales de producción

## 11. Monitoreo y Reportes

### Panel de Mercado Pago
- **Ventas**: Ver todos los pagos recibidos
- **Liberaciones**: Cuándo se libera el dinero
- **Contracargos**: Disputas de clientes

### Webhooks Log
- Ve a tu aplicación → **Webhooks**
- Ver historial de notificaciones enviadas
- Reintentar notificaciones fallidas

## 12. Costos y Comisiones

### Argentina
- Transferencia bancaria: 0%
- Tarjeta de débito: 3.99% + IVA
- Tarjeta de crédito: 3.99% + IVA
- 3, 6, 12 cuotas sin interés: 12.99% + IVA

### Retiro a Banco
- Sin cargo para retiros a cuentas bancarias argentinas
- Disponibilidad: Inmediata o en 1 día hábil

## Links Útiles

- **Developer Portal**: https://www.mercadopago.com.ar/developers
- **Documentación**: https://www.mercadopago.com.ar/developers/es/docs
- **Tarjetas de Prueba**: https://www.mercadopago.com.ar/developers/es/docs/checkout-pro/additional-content/test-cards
- **API Reference**: https://www.mercadopago.com.ar/developers/es/reference
- **SDKs**: https://www.mercadopago.com.ar/developers/es/docs/sdks-library
- **Soporte**: https://www.mercadopago.com.ar/developers/es/support

## Próximos Pasos

1. [ ] Crear cuenta en MP Developer
2. [ ] Crear aplicación y obtener credenciales TEST
3. [ ] Configurar webhook URL
4. [ ] Crear usuarios de prueba
5. [ ] Probar flujo completo en sandbox
6. [ ] Activar cuenta para producción
7. [ ] Obtener credenciales PROD
8. [ ] Deploy a producción
