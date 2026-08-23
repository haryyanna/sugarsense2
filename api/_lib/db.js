import { neon } from '@neondatabase/serverless';

const connectionString = process.env.NEON_DATABASE_URL || '';

if (!connectionString) {
  console.warn('NEON_DATABASE_URL is not set. API routes will fail until configured.');
}

export const sql = connectionString ? neon(connectionString) : null;

export const requireSql = () => {
  if (!sql) {
    throw new Error('NEON_DATABASE_URL belum dikonfigurasi.');
  }
  return sql;
};

export const json = (res, statusCode, payload) => {
  res.status(statusCode).json(payload);
};

export const normalizeUsername = (value) => String(value || '').trim();
