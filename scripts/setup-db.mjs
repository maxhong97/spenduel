/**
 * Supabase DB 스키마 자동 설정 스크립트
 * node scripts/setup-db.mjs
 */
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://xtuepitzfcahhyrkbqpb.supabase.co';
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh0dWVwaXR6ZmNhaGh5cmticXBiIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NTk4ODIzMiwiZXhwIjoyMDkxNTY0MjMyfQ.IvLYPsF18gPW5MSTAqRAtzL3hpNhgc6P73dvCLYjmxc';

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

// SQL 문장을 세미콜론으로 분리해 순차 실행
async function runSQL(label, sql) {
  const statements = sql
    .split(/;\s*\n/)
    .map(s => s.trim())
    .filter(s => s.length > 0 && !s.startsWith('--'));

  for (const stmt of statements) {
    const { error } = await supabase.rpc('exec_sql', { query: stmt + ';' });
    if (error && !error.message.includes('already exists')) {
      console.error(`  ✗ [${label}] ${error.message.slice(0, 120)}`);
      console.error(`    SQL: ${stmt.slice(0, 80)}...`);
    }
  }
}

async function main() {
  console.log('🚀 Spenduel DB 설정 시작...\n');

  // 1. exec_sql helper 함수 생성 (service_role로만 실행 가능)
  console.log('1. exec_sql 헬퍼 함수 생성...');
  const createHelperRes = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
    method: 'POST',
    headers: {
      'apikey': SERVICE_ROLE_KEY,
      'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query: 'SELECT 1' }),
  });

  if (createHelperRes.status === 404) {
    // exec_sql 함수가 없으므로 Management API로 직접 생성
    console.log('   exec_sql 없음 → Management API 방식으로 전환...');
    await runViaManagementAPI();
    return;
  }

  console.log('   exec_sql 존재 확인됨\n');
  await runSchemaViaRPC();
}

async function execSQL(sql) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
    method: 'POST',
    headers: {
      apikey: SERVICE_ROLE_KEY,
      Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query: sql }),
  });
  return res;
}

async function runViaManagementAPI() {
  // Supabase DB Query API (service_role JWT를 DB password로 사용하는 pooler)
  // Transaction pooler: postgres.{ref}@aws-0-{region}.pooler.supabase.com:6543
  const regions = ['ap-northeast-2', 'us-east-1', 'ap-southeast-1', 'eu-west-1'];

  let connected = false;
  for (const region of regions) {
    const host = `aws-0-${region}.pooler.supabase.com`;
    const connStr = `postgresql://postgres.xtuepitzfcahhyrkbqpb:${SERVICE_ROLE_KEY}@${host}:6543/postgres`;
    process.stdout.write(`   ${region} 연결 시도... `);

    try {
      const { default: pg } = await import('pg');
      const client = new pg.Client({
        connectionString: connStr,
        ssl: { rejectUnauthorized: false },
        connectionTimeoutMillis: 5000,
      });
      await client.connect();
      console.log('✓ 연결 성공!');
      await runSchemaViaPostgres(client);
      await client.end();
      connected = true;
      break;
    } catch (e) {
      console.log(`✗ (${e.message.slice(0, 50)})`);
    }
  }

  if (!connected) {
    console.log('\n⚠️  자동 연결 실패. 아래 SQL을 Supabase SQL Editor에서 실행해주세요:');
    console.log('   https://supabase.com/dashboard/project/xtuepitzfcahhyrkbqpb/sql');
    console.log('   파일: supabase/schema.sql\n');
  }
}

async function runSchemaViaPostgres(client) {
  const { readFileSync } = await import('fs');
  const { fileURLToPath } = await import('url');
  const { dirname, join } = await import('path');
  const __dirname = dirname(fileURLToPath(import.meta.url));

  const schemaSql = readFileSync(join(__dirname, '../supabase/schema.sql'), 'utf8');
  const cleanDaySql = readFileSync(join(__dirname, '../supabase/clean_day_function.sql'), 'utf8');

  console.log('\n2. 테이블 생성...');
  const schemaStatements = schemaSql
    .split(/;\s*(?=\n|$)/)
    .map(s => s.trim())
    .filter(s => s.length > 10 && !s.startsWith('--'));

  for (const stmt of schemaStatements) {
    if (stmt.startsWith('--') || stmt.length < 5) continue;
    try {
      await client.query(stmt);
      const match = stmt.match(/CREATE (?:TABLE|INDEX|POLICY|EXTENSION)\s+(?:IF NOT EXISTS\s+)?(\S+)/i);
      if (match) console.log(`   ✓ ${match[0].slice(0, 60)}`);
    } catch (e) {
      if (!e.message.includes('already exists')) {
        console.log(`   ⚠ ${e.message.slice(0, 80)}`);
      }
    }
  }

  console.log('\n3. clean_day 집계 함수 생성...');
  try {
    await client.query(cleanDaySql);
    console.log('   ✓ award_clean_days() 함수 생성됨');
  } catch (e) {
    if (!e.message.includes('already exists')) {
      console.log(`   ⚠ ${e.message.slice(0, 80)}`);
    }
  }

  await setupStorage(client);

  console.log('\n✅ DB 스키마 설정 완료!');
  console.log('\n📌 남은 수동 작업:');
  console.log('   Supabase Dashboard → Database → Replication 에서');
  console.log('   score_events, disputes, duels 테이블 Realtime 활성화');
}

async function setupStorage(client) {
  console.log('\n4. Storage 버킷(evidences) 생성...');
  const { data: existing } = await supabase.storage.getBucket('evidences');
  if (existing) {
    console.log('   ✓ evidences 버킷 이미 존재');
    return;
  }
  const { error } = await supabase.storage.createBucket('evidences', {
    public: true,
    fileSizeLimit: 5242880, // 5MB
    allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp'],
  });
  if (error) {
    console.log(`   ⚠ ${error.message}`);
  } else {
    console.log('   ✓ evidences 버킷 생성됨 (public, 5MB 제한)');
  }

  // Storage 정책 추가
  await client.query(`
    INSERT INTO storage.buckets (id, name, public)
    VALUES ('evidences', 'evidences', true)
    ON CONFLICT (id) DO UPDATE SET public = true;
  `).catch(() => {});
}

main().catch(console.error);
