# Kitchen AI Companion

Tu asistente de cocina inteligente con IA, diseñado para ayudarte a cocinar de manera saludable y personalizada según tus objetivos nutricionales.

## Descripción

Kitchen AI Companion es una aplicación web que combina inteligencia artificial con conocimientos de nutrición para ofrecer una experiencia culinaria personalizada. El asistente actúa como un **Nutricionista Deportivo y Chef profesional**, adaptando recetas y recomendaciones según el perfil de cada usuario.

## Características Principales

### Chef AI - Asistente Inteligente
- **Perfil de Nutricionista Experto**: El asistente tiene conocimientos en nutrición deportiva, dietética y cocina saludable
- **Respuestas Personalizadas**: Adapta las recetas según tus objetivos (bajar de peso, ganar músculo, comer saludable)
- **Localización de Ingredientes**: Usa los nombres de ingredientes correctos según tu país (ej: "palta" en Argentina, "aguacate" en México)
- **Valores Nutricionales**: Incluye información de calorías, proteínas, carbohidratos y grasas en cada receta
- **Sustituciones Inteligentes**: Sugiere alternativas cuando un ingrediente no está disponible en tu región

### Perfil de Usuario Completo
- **Datos Biométricos**: Peso, altura, edad, género
- **Cálculo de IMC**: Análisis automático del índice de masa corporal
- **Objetivos de Fitness**: Bajar de peso, ganar músculo, mantener, comer saludable
- **Restricciones Dietéticas**: Vegetariano, vegano, celíaco, sin lactosa, keto, paleo
- **Alergias Alimentarias**: Nueces, maní, mariscos, huevo, soja, pescado
- **Preferencias Culinarias**: Mexicana, italiana, asiática, mediterránea, argentina, etc.
- **País de Residencia**: Para localización de ingredientes y métodos de pago

### Planificador de Comidas
- Planificación semanal de menús
- Adaptado a tus calorías objetivo
- Considera tus preferencias y restricciones

### Sistema de Suscripción
- **Plan Gratuito**: 15 consultas por semana
- **Plan Semanal**: Consultas ilimitadas + todas las funciones premium
- **Plan Mensual**: Mejor valor (25% de ahorro vs semanal)
- **Pagos**: MercadoPago (Argentina)

## Países Soportados para Localización

La app adapta los nombres de ingredientes para:
- Argentina
- México
- Perú
- Colombia
- Chile
- España
- Venezuela
- Ecuador
- Uruguay
- Paraguay
- Bolivia
- Y más países hispanohablantes

## Tecnologías Utilizadas

### Frontend
- **React 18** + TypeScript
- **Vite** - Build tool
- **Tailwind CSS** - Estilos
- **shadcn/ui** - Componentes UI
- **Framer Motion** - Animaciones
- **React Router** - Navegación
- **React Markdown** - Renderizado de respuestas

### Backend
- **Supabase** - Base de datos PostgreSQL y autenticación
- **Supabase Edge Functions** - APIs serverless (Deno)
- **Google Gemini AI** - Modelo de lenguaje (gemini-2.5-flash-lite)

### Pagos
- **MercadoPago** - Procesamiento de pagos (Argentina)
- Suscripciones recurrentes con Preapproval API

### Herramientas de Desarrollo
- **Lovable** - Plataforma de desarrollo inicial del proyecto
- **Claude Code** - Asistente de IA para desarrollo y mejoras
- **Cursor** - IDE con IA integrada para desarrollo

## Estructura del Proyecto

```
kitchen-ai-companion/
├── src/
│   ├── components/          # Componentes React
│   │   ├── ui/              # Componentes shadcn/ui
│   │   ├── AppSidebar.tsx   # Sidebar de navegación
│   │   ├── ChatMessage.tsx  # Mensajes del chat
│   │   ├── ChatPlayground.tsx # Interfaz del chat
│   │   └── SubscriptionModal.tsx # Modal de suscripción
│   ├── hooks/               # Custom hooks
│   │   ├── useProfile.ts    # Gestión del perfil
│   │   └── useSubscription.ts # Estado de suscripción
│   ├── pages/               # Páginas de la app
│   │   ├── Index.tsx        # Página principal
│   │   ├── Profile.tsx      # Perfil de usuario
│   │   └── Pricing.tsx      # Planes y precios
│   ├── integrations/        # Configuración de Supabase
│   └── lib/                 # Utilidades
├── supabase/
│   ├── functions/           # Edge Functions
│   │   ├── chat-cocina/     # Chat con IA + localización
│   │   ├── check-subscription/ # Verificar suscripción
│   │   ├── detect-country/  # Detectar país del usuario
│   │   ├── get-exchange-rate/ # Tipo de cambio USD/ARS
│   │   ├── mercadopago-create-subscription/ # Crear suscripción MP
│   │   └── mercadopago-webhook/ # Webhooks de MP
│   └── migrations/          # Migraciones de DB
└── public/                  # Assets estáticos
```

## Funciones de la IA

### Cálculos Nutricionales
- **Calorías Diarias**: Fórmula de Mifflin-St Jeor con factor de actividad
- **Peso Ideal**: Fórmula de Devine modificada
- **IMC**: Clasificación según OMS (bajo peso, normal, sobrepeso, obesidad)

### Personalización de Recetas
- Ajuste de porciones según objetivo calórico
- Sustitución de ingredientes calóricos para pérdida de peso
- Aumento de proteínas para ganancia muscular
- Respeto absoluto de alergias y restricciones

### Localización de Ingredientes
El sistema adapta automáticamente los nombres de ingredientes según el país del usuario:

| Ingrediente | Argentina | México | Perú | España |
|-------------|-----------|--------|------|--------|
| Aguacate | Palta | Aguacate | Palta | Aguacate |
| Maíz | Choclo | Elote | Choclo | Mazorca |
| Frijoles | Porotos | Frijoles | Frejoles | Judías |
| Fresa | Frutilla | Fresa | Fresa | Fresa |
| Mantequilla | Manteca | Mantequilla | Mantequilla | Mantequilla |

## Modelo de Suscripción

| Característica | Gratis | Semanal | Mensual |
|---------------|--------|---------|---------|
| Consultas | 15/semana | Ilimitadas | Ilimitadas |
| Recetas básicas | ✓ | ✓ | ✓ |
| Recetas premium | ✗ | ✓ | ✓ |
| Planificador | ✗ | ✓ | ✓ |
| Historial completo | ✗ | ✓ | ✓ |
| Soporte prioritario | ✗ | ✓ | ✓ |

### Precios
- **Plan Semanal**: USD $4.99 (ARS calculado con tipo de cambio MEP)
- **Plan Mensual**: USD $14.99 (25% de ahorro)

## Deploy

### Frontend
- **Vercel**: Conectado al repositorio de GitHub
- Build automático en cada push a `main`

### Backend
- **Supabase**: Edge Functions desplegadas manualmente
- Base de datos PostgreSQL gestionada

## Contribuir

1. Fork el repositorio
2. Crea una rama (`git checkout -b feature/nueva-funcionalidad`)
3. Commit tus cambios (`git commit -m 'Agregar nueva funcionalidad'`)
4. Push a la rama (`git push origin feature/nueva-funcionalidad`)
5. Abre un Pull Request

## Licencia

Este proyecto es privado y de uso comercial.

## Contacto

Para soporte, consultas o colaboraciones:

**Carlos Jesús**
[![LinkedIn](https://img.shields.io/badge/LinkedIn-0077B5?style=for-the-badge&logo=linkedin&logoColor=white)](https://www.linkedin.com/in/carlos-jesus-dev)

---

**Stack**: React + TypeScript + Supabase + Google Gemini AI

**Desarrollado con amor para cocineros de habla hispana**
