#!/usr/bin/env -S node
import type { Contract as End } from '../../snapshots/08ef3e43d3b41a73a84914dbe16dee56c8a53e5e141fa63057aaf331fa9a19ac/contract';
import endContract from '../../snapshots/08ef3e43d3b41a73a84914dbe16dee56c8a53e5e141fa63057aaf331fa9a19ac/contract.json' with { type: 'json' };
import type { Contract as Start } from '../../snapshots/8a2ab38a637166638063042d33f132e6ee9f780d2aae7aabc2d264ec84f4b44b/contract';
import startContract from '../../snapshots/8a2ab38a637166638063042d33f132e6ee9f780d2aae7aabc2d264ec84f4b44b/contract.json' with { type: 'json' };
import { Migration, MigrationCLI, col, fn, primaryKey, sql } from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.createTable({
        schema: 'public',
        table: 'purchase_requests',
        columns: [
          col('buyer_id', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('created_at', 'timestamptz', {
            notNull: true,
            default: fn(sql`now()`),
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('id', 'SERIAL', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('idempotency_key', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('request_hash', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('response_json', 'text', { codecRef: { codecId: 'pg/text@1' } }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.addUnique({
        schema: 'public',
        table: 'purchase_requests',
        constraint: 'purchase_requests_buyer_id_idempotency_key_key',
        columns: ['buyer_id', 'idempotency_key'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'purchase_requests',
        index: 'purchase_requests_buyer_id_idx_a09525cc',
        columns: ['buyer_id'],
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'purchase_requests',
        foreignKey: {
          name: 'purchase_requests_buyer_id_fkey',
          columns: ['buyer_id'],
          references: { schema: 'public', table: 'users', columns: ['id'] },
        },
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
