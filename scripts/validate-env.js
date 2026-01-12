#!/usr/bin/env node

/**
 * Validates that all required environment variables are present
 * Run before build to catch missing env vars early
 */

const requiredEnvVars = [
  'VITE_SUPABASE_URL',
  'VITE_SUPABASE_PUBLISHABLE_KEY',
  'VITE_SUPABASE_PROJECT_ID',
];

console.log('🔍 Validando variables de entorno...\n');

let hasErrors = false;

requiredEnvVars.forEach((varName) => {
  const value = process.env[varName];

  if (!value) {
    console.error(`❌ ERROR: Variable de entorno faltante: ${varName}`);
    hasErrors = true;
  } else {
    console.log(`✅ ${varName}: OK`);
  }
});

console.log('');

if (hasErrors) {
  console.error('❌ Faltan variables de entorno requeridas.');
  console.error('');
  console.error('Por favor:');
  console.error('1. Copia .env.example a .env');
  console.error('2. Llena los valores en .env con tus credenciales');
  console.error('3. Para Vercel, configura las variables en Settings → Environment Variables');
  console.error('');
  console.error('Ver DEPLOYMENT.md para más información.');
  process.exit(1);
}

console.log('✅ Todas las variables de entorno están configuradas correctamente.\n');
