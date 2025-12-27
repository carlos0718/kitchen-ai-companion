import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Supabase credentials from .env
const supabaseUrl = 'https://lngunkhtkunkghtvmpfv.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxuZ3Vua2h0a3Vua2dodHZtcGZ2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU4MjU1MzksImV4cCI6MjA4MTQwMTUzOX0.pek1Uj--VoNw87TgibsmSO8vtHGiZ8zVCKTHQDi8DRM';

const supabase = createClient(supabaseUrl, supabaseKey);

async function runMigration() {
  console.log('🚀 Iniciando migración de base de datos...\n');

  // Read the migration file
  const migrationPath = join(__dirname, '..', 'supabase', 'migrations', '20251222215314_user_profiles_meal_planning.sql');
  const migrationSQL = readFileSync(migrationPath, 'utf-8');

  // Split SQL into individual statements
  const statements = migrationSQL
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0 && !s.startsWith('--'));

  console.log(`📝 Ejecutando ${statements.length} sentencias SQL...\n`);

  let successCount = 0;
  let errorCount = 0;

  for (let i = 0; i < statements.length; i++) {
    const statement = statements[i] + ';';

    // Skip comments
    if (statement.trim().startsWith('--')) continue;

    try {
      const { error } = await supabase.rpc('exec_sql', { sql_query: statement });

      if (error) {
        // If exec_sql doesn't exist, try direct query
        console.log(`Ejecutando sentencia ${i + 1}/${statements.length}...`);

        // For DDL statements, we need to use the REST API directly
        const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': supabaseKey,
            'Authorization': `Bearer ${supabaseKey}`
          },
          body: JSON.stringify({ query: statement })
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        successCount++;
        console.log(`✅ Sentencia ${i + 1} ejecutada`);
      } else {
        successCount++;
        console.log(`✅ Sentencia ${i + 1} ejecutada`);
      }
    } catch (error) {
      errorCount++;
      console.error(`❌ Error en sentencia ${i + 1}:`, error.message);
      console.error('Sentencia:', statement.substring(0, 100) + '...');
    }
  }

  console.log('\n' + '='.repeat(50));
  console.log(`\n📊 Resumen:`);
  console.log(`   ✅ Exitosas: ${successCount}`);
  console.log(`   ❌ Errores: ${errorCount}`);
  console.log('\n' + '='.repeat(50));

  if (errorCount === 0) {
    console.log('\n🎉 ¡Migración completada exitosamente!\n');
  } else {
    console.log('\n⚠️  Migración completada con errores.\n');
  }
}

runMigration().catch(console.error);
