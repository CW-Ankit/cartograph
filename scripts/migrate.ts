import { neon } from '@neondatabase/serverless';
import fs from 'fs';
import path from 'path';

async function migrate() {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    throw new Error('DATABASE_URL is not set');
  }

  const sql = neon(dbUrl);
  const sqlContent = fs.readFileSync(path.resolve(process.cwd(), 'migrations/0001_initial_schema.sql'), 'utf8');

  // Remove full line comments and extract statements by semicolon
  const cleanSql = sqlContent
    .split('\n')
    .filter((line) => !line.trim().startsWith('--'))
    .join('\n');

  const statements = cleanSql
    .split(';')
    .map((s) => s.trim())
    .filter((s) => s.length > 0);

  console.log(`Executing ${statements.length} schema statements...`);

  for (let i = 0; i < statements.length; i++) {
    const stmt = statements[i];
    const preview = stmt.replace(/\s+/g, ' ').slice(0, 60);
    try {
      await sql.query(stmt);
      console.log(`[${i + 1}/${statements.length}] OK: ${preview}`);
    } catch (err: unknown) {
      console.error(`[${i + 1}/${statements.length}] FAILED: ${preview}`);
      console.error('Error:', err);
    }
  }

  const tables = await sql`
    SELECT tablename
    FROM pg_tables
    WHERE schemaname = 'public';
  `;
  console.log('\nTables now present in public schema:');
  console.table(tables);
}

migrate().catch(console.error);
