import pg from 'pg';

/** 기존 BE의 DB 풀을 사용해도 됩니다. 이 파일은 독립 실행 시에만 필요합니다. */
export function createPool() {
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL 환경변수가 필요합니다.');
  return new pg.Pool({
    connectionString: process.env.DATABASE_URL,
    max: 10,
    // 배포 환경 SSL 요구 여부는 팀 환경에 맞춰 설정
  });
}

/** 하나라도 실패하면 모두 롤백합니다. */
export async function inTransaction(pool, callback) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    try { await client.query('ROLLBACK'); } catch { /* 원본 오류를 보존합니다 */ }
    throw error;
  } finally {
    client.release();
  }
}
