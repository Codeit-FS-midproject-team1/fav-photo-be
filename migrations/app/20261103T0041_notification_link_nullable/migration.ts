#!/usr/bin/env -S node
import type { Contract as End } from '../../snapshots/8a2ab38a637166638063042d33f132e6ee9f780d2aae7aabc2d264ec84f4b44b/contract';
import endContract from '../../snapshots/8a2ab38a637166638063042d33f132e6ee9f780d2aae7aabc2d264ec84f4b44b/contract.json' with { type: 'json' };
import type { Contract as Start } from '../../snapshots/ea945ccf501edb7cc087c6f86feeefee931c0b56940ffb7161a469c4dfb76fe4/contract';
import startContract from '../../snapshots/ea945ccf501edb7cc087c6f86feeefee931c0b56940ffb7161a469c4dfb76fe4/contract.json' with { type: 'json' };
import { Migration, MigrationCLI, col, lit } from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.setDefault({
        schema: 'public',
        table: 'notifications',
        column: col('is_read', 'bool', { default: lit(false), codecRef: { codecId: 'pg/bool@1' } }),
      }),
      this.dropNotNull({ schema: 'public', table: 'notifications', column: 'link' }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
