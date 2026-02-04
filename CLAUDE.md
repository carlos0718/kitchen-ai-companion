# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Kitchen AI Companion is a Spanish-language cooking assistant web app that provides personalized recipes and meal planning using AI. It features a nutritionist persona (Chef AI) that adapts recommendations based on user profiles, dietary restrictions, and regional ingredient names.

## Common Commands

### Development
```bash
npm run dev          # Start dev server (Vite)
npm run build        # Production build (validates env first)
npm run lint         # ESLint
npm run preview      # Preview production build
```

### Supabase Edge Functions
```bash
# Deploy a single function
npx supabase functions deploy <function-name> --no-verify-jwt

# Deploy all functions
npx supabase functions deploy --no-verify-jwt

# Common functions to deploy after changes:
npx supabase functions deploy chat-cocina --no-verify-jwt
npx supabase functions deploy generate-meal-plan --no-verify-jwt
npx supabase functions deploy check-subscription --no-verify-jwt
```

### Environment Setup
Copy `.env.example` to `.env` and configure:
- `VITE_SUPABASE_URL` - Supabase project URL
- `VITE_SUPABASE_PUBLISHABLE_KEY` - Supabase anon key
- `VITE_SUPABASE_PROJECT_ID` - Supabase project ID

Edge functions require secrets set in Supabase dashboard:
- `GEMINI_API_KEY` - Google AI API key
- `MERCADOPAGO_ACCESS_TOKEN` - MercadoPago production token
- `SUPABASE_SERVICE_ROLE_KEY` - For admin operations

## Architecture

### Frontend (React + TypeScript + Vite)
- **Pages**: `src/pages/` - Index (landing), Profile, Chat, MealPlanner, DietGuide
- **Components**: `src/components/` - UI components, shadcn/ui in `ui/` subfolder
- **Hooks**: `src/hooks/` - Custom hooks for profile, subscription, chat, meal planning
- **Landing**: `src/components/landing/` - LandingHero, FeaturesSection, DietsSection, FAQSection

### Backend (Supabase Edge Functions - Deno)
Located in `supabase/functions/`:

**Core AI Functions:**
- `chat-cocina/` - Main chat with Gemini AI, includes ingredient localization by country, input sanitization, and role enforcement
- `generate-meal-plan/` - Weekly/daily meal plan generation with variety tracking

**Subscription & Payments:**
- `check-subscription/` - Validates user subscription status (mercadopago or manual)
- `mercadopago-create-subscription/` - Creates MP subscription checkout
- `mercadopago-webhook/` - Handles MP payment notifications
- `detect-country/` - Geo-detection for payment availability (Argentina only for now)

**Usage Tracking:**
- `check-usage/` - Checks weekly query limits for free users
- `increment-usage/` - Increments query counter

### Database (Supabase PostgreSQL)
Key tables (all have RLS policies):
- `user_profiles` - User data, preferences, dietary restrictions, country
- `user_subscriptions` - Subscription status, plan, payment gateway
- `conversations` / `messages` - Chat history
- `meal_plans` / `meal_plan_items` / `recipes` - Meal planning data
- `usage_tracking` - Query counts per user per week

### Key Design Patterns

**Ingredient Localization:**
The `chat-cocina` function contains `INGREDIENT_LOCALIZATION_GUIDE` with country-specific ingredient names (e.g., "palta" in Argentina vs "aguacate" in Mexico). The user's country from their profile determines which terms to use.

**Diet Types:**
Supported diets are defined in multiple places that must stay in sync:
- `src/components/OnboardingWizard.tsx` - DIET_TYPES array
- `src/pages/DietGuide.tsx` - Diet guide content
- `src/components/landing/DietsSection.tsx` - Landing page display
- `supabase/functions/generate-meal-plan/index.ts` - getDietMacroDistribution()
- `supabase/functions/chat-cocina/index.ts` - translateDietType()

**Security:**
- Chat input is sanitized for prompt injection attempts
- Off-topic requests (coding, hacking, etc.) are detected and blocked
- CORS should be restricted to production domain in edge functions
- Subscription validation happens server-side in `check-subscription`

## Important Conventions

- **Language**: All user-facing text is in Spanish
- **Edge Functions**: Use `--no-verify-jwt` flag when deploying (JWT verification disabled in config)
- **Payments**: MercadoPago only works in Argentina; other countries see "not available" message
- **Manual Subscriptions**: `payment_gateway = 'manual'` allows admin-activated subscriptions
