# Mercado Pago - Pasos Rápidos

## ✅ Cambios Aplicados

- ✅ Código actualizado para usar **solo Mercado Pago**
- ✅ Stripe deshabilitado temporalmente
- ✅ Todos los usuarios (nacionales e internacionales) usarán MP

## 🚀 Pasos Inmediatos (15 minutos)

### 1. Crear Cuenta Developer (5 min)

```bash
1. Ve a: https://www.mercadopago.com.ar/developers
2. Inicia sesión con tu cuenta de Mercado Pago
   (o crea una cuenta si no tienes)
3. Acepta términos de desarrollador
```

### 2. Crear Aplicación (3 min)

```bash
1. Click en "Tus integraciones" → "Crear aplicación"
2. Completa:
   - Nombre: Kitchen AI Companion
   - Modelo de integración: Checkout Pro
   - Selecciona: ✅ Pagos online ✅ Suscripciones
3. Guardar
```

### 3. Obtener Credenciales de Testing (2 min)

```bash
1. Ve a tu aplicación → "Credenciales de prueba"
2. Copia el Access Token que empieza con "TEST-"
3. Guárdalo (lo necesitarás en el siguiente paso)
```

### 4. Configurar en Supabase (5 min)

```bash
# En tu terminal:
npx supabase secrets set MERCADOPAGO_ACCESS_TOKEN="TEST-xxxx..."

# Deploy la función actualizada:
npx supabase functions deploy detect-country
npx supabase functions deploy mercadopago-create-preference
npx supabase functions deploy mercadopago-webhook
```

### 5. Crear Usuario de Prueba (2 min)

```bash
1. En el panel de MP → "Usuarios de prueba"
2. Click "Crear usuario de prueba"
3. Selecciona país: Argentina
4. Dinero: 10000
5. Guarda el email y password generados
```

## 🧪 Probar el Flujo (10 min)

### 1. Iniciar App Local

```bash
npm run dev
```

### 2. Flujo de Prueba

```
1. Abre http://localhost:8080
2. Ve a la sección de precios
3. Click en "Suscribirse" (Plan Semanal o Mensual)
4. Serás redirigido a Mercado Pago
5. Paga con esta tarjeta de prueba:

   Número: 5031 7557 3453 0604
   CVV: 123
   Vencimiento: 11/25
   Titular: APRO
   DNI: 12345678

6. Confirmar pago
7. Serás redirigido a tu app
8. Verificar que la suscripción se activó
```

### 3. Verificar Logs

```bash
# En otra terminal, ver logs del webhook:
npx supabase functions logs mercadopago-webhook --project-ref [tu-ref]

# Ver logs de create-preference:
npx supabase functions logs mercadopago-create-preference --project-ref [tu-ref]
```

## 📋 Checklist de Testing

- [ ] Crear preferencia de pago funciona
- [ ] Redirección a MP Checkout funciona
- [ ] Pago con tarjeta de prueba funciona
- [ ] Webhook recibe notificación
- [ ] Suscripción se activa en la DB
- [ ] Usuario puede acceder a features premium
- [ ] Precio en ARS es correcto (usando MEP)

## 🎯 Para Producción (Cuando Estés Listo)

### 1. Activar Cuenta de Mercado Pago

```
1. Completa datos fiscales (CUIT/CUIL)
2. Verifica identidad
3. Acepta términos comerciales
4. Espera aprobación (24-48hs)
```

### 2. Obtener Credenciales de Producción

```
1. Ve a "Credenciales de producción"
2. Copia el Access Token que empieza con "APP-"
```

### 3. Configurar en Supabase Producción

```bash
# Para el proyecto de PRODUCCIÓN en Supabase:
npx supabase secrets set MERCADOPAGO_ACCESS_TOKEN="APP-xxxx..."
```

### 4. Deploy a Vercel

```bash
git add .
git commit -m "Configure Mercado Pago as sole payment gateway"
git push origin main
```

## ⚠️ Limitaciones Actuales

### Suscripciones Recurrentes
- MP no cobra automáticamente como Stripe
- Opciones:
  1. **Pagos únicos** (actual): Usuario paga por 7/30 días
  2. **Manual renewal**: Enviar email recordatorio antes de expirar
  3. **API Subscriptions**: Implementar API de suscripciones MP (más complejo)

### Pagos Internacionales
- MP acepta pagos internacionales
- Monedas soportadas:
  - 🇦🇷 ARS (Argentina)
  - 🇧🇷 BRL (Brasil)
  - 🇲🇽 MXN (México)
  - 🇨🇴 COP (Colombia)
  - 🇨🇱 CLP (Chile)
  - 🇵🇪 PEN (Perú)
  - 🇺🇾 UYU (Uruguay)

## 📞 Ayuda

Si encuentras problemas:

1. **Ver logs**: `npx supabase functions logs [function-name]`
2. **Documentación MP**: https://www.mercadopago.com.ar/developers/es/docs
3. **Panel de MP**: Ver historial de pagos y webhooks
4. **Guía completa**: Ver `MERCADOPAGO-SETUP.md`

## 🔄 Volver a Stripe (Futuro)

Si en el futuro quieres habilitar Stripe:

```typescript
// En detect-country/index.ts
const USE_ONLY_MERCADOPAGO = false; // Cambiar a false
```

Luego:
```bash
npx supabase functions deploy detect-country
```

## 🎉 ¡Listo!

Ya estás configurado para aceptar pagos con Mercado Pago.

Próximos pasos:
1. Probar el flujo completo en local
2. Deployar a Vercel staging
3. Probar en staging
4. Activar cuenta MP para producción
5. Deploy a producción

¿Dudas? Revisa `MERCADOPAGO-SETUP.md` para más detalles.
