#!/usr/bin/env -S node
import type { Contract as End } from '../../snapshots/ea945ccf501edb7cc087c6f86feeefee931c0b56940ffb7161a469c4dfb76fe4/contract';
import endContract from '../../snapshots/ea945ccf501edb7cc087c6f86feeefee931c0b56940ffb7161a469c4dfb76fe4/contract.json' with { type: 'json' };
import {
  Migration,
  MigrationCLI,
  checkExpression,
  col,
  fn,
  lit,
  primaryKey,
  sql,
} from '@prisma/orm-postgres/migration';

export default class M extends Migration<never, End> {
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.createSchema({ schema: 'public' }),
      this.createTable({
        schema: 'public',
        table: 'card_items',
        columns: [
          col('acquired_at', 'timestamptz', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('id', 'SERIAL', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('listing_id', 'int4', { codecRef: { codecId: 'pg/int4@1' } }),
          col('offer_id', 'int4', { codecRef: { codecId: 'pg/int4@1' } }),
          col('owner_id', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('photo_card_id', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('status', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
        ],
        constraints: [
          primaryKey(['id']),
          checkExpression(
            'card_items_status_check_80844175',
            sql`"status" IN ('HELD', 'ON_SALE', 'OFFERED')`,
          ),
        ],
      }),
      this.createTable({
        schema: 'public',
        table: 'creation_logs',
        columns: [
          col('created_count', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('id', 'SERIAL', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('user_id', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('year_month', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.createTable({
        schema: 'public',
        table: 'exchange_offers',
        columns: [
          col('created_at', 'timestamptz', {
            notNull: true,
            default: fn(sql`now()`),
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('description', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('id', 'SERIAL', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('listing_id', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('offered_card_item_id', 'int4', {
            notNull: true,
            codecRef: { codecId: 'pg/int4@1' },
          }),
          col('offerer_id', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('status', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
        ],
        constraints: [
          primaryKey(['id']),
          checkExpression(
            'exchange_offers_status_check_d2074f89',
            sql`"status" IN ('PENDING', 'ACCEPTED', 'REJECTED', 'CANCELED')`,
          ),
        ],
      }),
      this.createTable({
        schema: 'public',
        table: 'notifications',
        columns: [
          col('created_at', 'timestamptz', {
            notNull: true,
            default: fn(sql`now()`),
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('id', 'SERIAL', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('is_read', 'bool', { notNull: true, codecRef: { codecId: 'pg/bool@1' } }),
          col('link', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('message', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('type', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('user_id', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
        ],
        constraints: [
          primaryKey(['id']),
          checkExpression(
            'notifications_type_check_d9525f4c',
            sql`"type" IN ('SIGNUP', 'OFFER_RECEIVED', 'OFFER_ACCEPTED', 'OFFER_REJECTED', 'PURCHASE_COMPLETED', 'SALE_COMPLETED', 'SOLD_OUT', 'LISTING_UPDATED')`,
          ),
        ],
      }),
      this.createTable({
        schema: 'public',
        table: 'photo_cards',
        columns: [
          col('created_at', 'timestamptz', {
            notNull: true,
            default: fn(sql`now()`),
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('creator_id', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('description', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('genre', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('id', 'SERIAL', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('image_url', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('method', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('name', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('price', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('total_quantity', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
        ],
        constraints: [
          primaryKey(['id']),
          checkExpression(
            'photo_cards_genre_check_6cc1e4b5',
            sql`"genre" IN ('LANDSCAPE', 'PORTRAIT', 'ANIMAL', 'PLANT', 'OBJECT', 'ETC')`,
          ),
          checkExpression(
            'photo_cards_method_check_9a7762d3',
            sql`"method" IN ('PHOTO', 'CRAFT', 'AI', 'ETC')`,
          ),
          checkExpression('photo_cards_price_range_c521b70e', sql`"price" BETWEEN 1 AND 1000`),
        ],
      }),
      this.createTable({
        schema: 'public',
        table: 'point_histories',
        columns: [
          col('amount', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('balance_after', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('created_at', 'timestamptz', {
            notNull: true,
            default: fn(sql`now()`),
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('id', 'SERIAL', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('idempotency_key', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('reason', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('user_id', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
        ],
        constraints: [
          primaryKey(['id']),
          checkExpression(
            'point_histories_balance_after_nonnegative_6fffd8c7',
            sql`"balance_after" >= 0`,
          ),
          checkExpression(
            'point_histories_reason_check_dbb7e44f',
            sql`"reason" IN ('SIGNUP', 'PURCHASE', 'SALE', 'RANDOM')`,
          ),
        ],
      }),
      this.createTable({
        schema: 'public',
        table: 'random_point_logs',
        columns: [
          col('draw_date', 'date', { notNull: true, codecRef: { codecId: 'pg/date-string@1' } }),
          col('earned_points', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('id', 'SERIAL', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('used_count', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('user_id', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
        ],
        constraints: [
          primaryKey(['id']),
          checkExpression('random_point_logs_used_count_max_2835319b', sql`"used_count" <= 3`),
        ],
      }),
      this.createTable({
        schema: 'public',
        table: 'refresh_tokens',
        columns: [
          col('created_at', 'timestamptz', {
            notNull: true,
            default: fn(sql`now()`),
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('expires_at', 'timestamptz', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('id', 'SERIAL', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('token_hash', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('user_id', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.createTable({
        schema: 'public',
        table: 'sale_listings',
        columns: [
          col('created_at', 'timestamptz', {
            notNull: true,
            default: fn(sql`now()`),
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('exchange_description', 'text', {
            notNull: true,
            codecRef: { codecId: 'pg/text@1' },
          }),
          col('exchange_genre', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('exchange_method', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('id', 'SERIAL', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('photo_card_id', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('price', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('remaining_quantity', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('sale_quantity', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('seller_id', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('status', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('updated_at', 'timestamptz', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
        ],
        constraints: [
          primaryKey(['id']),
          checkExpression(
            'sale_listings_exchange_genre_check_5fe27ace',
            sql`"exchange_genre" IN ('LANDSCAPE', 'PORTRAIT', 'ANIMAL', 'PLANT', 'OBJECT', 'ETC')`,
          ),
          checkExpression(
            'sale_listings_exchange_method_check_ca76d0b3',
            sql`"exchange_method" IN ('PHOTO', 'CRAFT', 'AI', 'ETC')`,
          ),
          checkExpression('sale_listings_price_range_c521b70e', sql`"price" BETWEEN 1 AND 1000`),
          checkExpression(
            'sale_listings_quantity_bounds_279e31ff',
            sql`"sale_quantity" > 0 AND "remaining_quantity" <= "sale_quantity"`,
          ),
          checkExpression(
            'sale_listings_remaining_nonnegative_1012e92c',
            sql`"remaining_quantity" >= 0`,
          ),
          checkExpression(
            'sale_listings_status_check_32a7d91e',
            sql`"status" IN ('ON_SALE', 'SOLD_OUT', 'CANCELED')`,
          ),
        ],
      }),
      this.createTable({
        schema: 'public',
        table: 'trades',
        columns: [
          col('counterpart_id', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('created_at', 'timestamptz', {
            notNull: true,
            default: fn(sql`now()`),
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('id', 'SERIAL', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('photo_card_id', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('points', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('quantity', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('received_photo_card_id', 'int4', { codecRef: { codecId: 'pg/int4@1' } }),
          col('seller_id', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('type', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
        ],
        constraints: [
          primaryKey(['id']),
          checkExpression(
            'trades_quantity_points_valid_3837e16a',
            sql`"quantity" > 0 AND "points" >= 0`,
          ),
          checkExpression('trades_type_check_e811fb8e', sql`"type" IN ('PURCHASE', 'EXCHANGE')`),
        ],
      }),
      this.createTable({
        schema: 'public',
        table: 'users',
        columns: [
          col('created_at', 'timestamptz', {
            notNull: true,
            default: fn(sql`now()`),
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('deleted_at', 'timestamptz', { codecRef: { codecId: 'pg/timestamptz-string@1' } }),
          col('email', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('google_id', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('id', 'SERIAL', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('nickname', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('password', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('points', 'int4', {
            notNull: true,
            default: lit(0),
            codecRef: { codecId: 'pg/int4@1' },
          }),
        ],
        constraints: [
          primaryKey(['id']),
          checkExpression('users_points_nonnegative_2f2703ae', sql`"points" >= 0`),
        ],
      }),
      this.addUnique({
        schema: 'public',
        table: 'creation_logs',
        constraint: 'creation_logs_user_id_year_month_key',
        columns: ['user_id', 'year_month'],
      }),
      this.addUnique({
        schema: 'public',
        table: 'point_histories',
        constraint: 'point_histories_user_id_idempotency_key_key',
        columns: ['user_id', 'idempotency_key'],
      }),
      this.addUnique({
        schema: 'public',
        table: 'random_point_logs',
        constraint: 'random_point_logs_user_id_draw_date_key',
        columns: ['user_id', 'draw_date'],
      }),
      this.addUnique({
        schema: 'public',
        table: 'refresh_tokens',
        constraint: 'refresh_tokens_token_hash_key',
        columns: ['token_hash'],
      }),
      this.addUnique({
        schema: 'public',
        table: 'users',
        constraint: 'users_email_key',
        columns: ['email'],
      }),
      this.addUnique({
        schema: 'public',
        table: 'users',
        constraint: 'users_nickname_key',
        columns: ['nickname'],
      }),
      this.addUnique({
        schema: 'public',
        table: 'users',
        constraint: 'users_google_id_key',
        columns: ['google_id'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'card_items',
        index: 'card_items_listing_id_idx_087601b6',
        columns: ['listing_id'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'card_items',
        index: 'card_items_listing_id_status_idx_b6a259da',
        columns: ['listing_id', 'status'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'card_items',
        index: 'card_items_offer_id_idx_f8c71ed4',
        columns: ['offer_id'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'card_items',
        index: 'card_items_owner_id_idx_ade9f347',
        columns: ['owner_id'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'card_items',
        index: 'card_items_owner_id_status_acquired_at_idx_96b6f48d',
        columns: ['owner_id', 'status', 'acquired_at'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'card_items',
        index: 'card_items_photo_card_id_idx_92021706',
        columns: ['photo_card_id'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'creation_logs',
        index: 'creation_logs_user_id_idx_6c952402',
        columns: ['user_id'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'exchange_offers',
        index: 'exchange_offers_listing_id_idx_087601b6',
        columns: ['listing_id'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'exchange_offers',
        index: 'exchange_offers_listing_id_status_idx_b6a259da',
        columns: ['listing_id', 'status'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'exchange_offers',
        index: 'exchange_offers_offered_card_item_id_idx_46740d09',
        columns: ['offered_card_item_id'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'exchange_offers',
        index: 'exchange_offers_offerer_id_idx_83b0edee',
        columns: ['offerer_id'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'exchange_offers',
        index: 'exchange_offers_offerer_id_status_idx_8336bfd3',
        columns: ['offerer_id', 'status'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'notifications',
        index: 'notifications_user_id_created_at_idx_b562028f',
        columns: ['user_id', 'created_at'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'notifications',
        index: 'notifications_user_id_idx_6c952402',
        columns: ['user_id'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'photo_cards',
        index: 'photo_cards_creator_id_idx_c8bab67a',
        columns: ['creator_id'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'point_histories',
        index: 'point_histories_user_id_created_at_idx_b562028f',
        columns: ['user_id', 'created_at'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'point_histories',
        index: 'point_histories_user_id_idx_6c952402',
        columns: ['user_id'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'random_point_logs',
        index: 'random_point_logs_user_id_idx_6c952402',
        columns: ['user_id'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'refresh_tokens',
        index: 'refresh_tokens_user_id_idx_6c952402',
        columns: ['user_id'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'sale_listings',
        index: 'sale_listings_photo_card_id_idx_92021706',
        columns: ['photo_card_id'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'sale_listings',
        index: 'sale_listings_seller_id_idx_de05cd59',
        columns: ['seller_id'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'sale_listings',
        index: 'sale_listings_status_created_at_idx_1bbe8adf',
        columns: ['status', 'created_at'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'sale_listings',
        index: 'sale_listings_status_price_idx_d94abea6',
        columns: ['status', 'price'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'trades',
        index: 'trades_counterpart_id_created_at_idx_8090177a',
        columns: ['counterpart_id', 'created_at'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'trades',
        index: 'trades_counterpart_id_idx_7924248e',
        columns: ['counterpart_id'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'trades',
        index: 'trades_photo_card_id_idx_92021706',
        columns: ['photo_card_id'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'trades',
        index: 'trades_received_photo_card_id_idx_98089ed0',
        columns: ['received_photo_card_id'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'trades',
        index: 'trades_seller_id_created_at_idx_c796964a',
        columns: ['seller_id', 'created_at'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'trades',
        index: 'trades_seller_id_idx_de05cd59',
        columns: ['seller_id'],
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'card_items',
        foreignKey: {
          name: 'card_items_photo_card_id_fkey',
          columns: ['photo_card_id'],
          references: { schema: 'public', table: 'photo_cards', columns: ['id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'card_items',
        foreignKey: {
          name: 'card_items_owner_id_fkey',
          columns: ['owner_id'],
          references: { schema: 'public', table: 'users', columns: ['id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'card_items',
        foreignKey: {
          name: 'card_items_listing_id_fkey',
          columns: ['listing_id'],
          references: { schema: 'public', table: 'sale_listings', columns: ['id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'card_items',
        foreignKey: {
          name: 'card_items_offer_id_fkey',
          columns: ['offer_id'],
          references: { schema: 'public', table: 'exchange_offers', columns: ['id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'creation_logs',
        foreignKey: {
          name: 'creation_logs_user_id_fkey',
          columns: ['user_id'],
          references: { schema: 'public', table: 'users', columns: ['id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'exchange_offers',
        foreignKey: {
          name: 'exchange_offers_listing_id_fkey',
          columns: ['listing_id'],
          references: { schema: 'public', table: 'sale_listings', columns: ['id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'exchange_offers',
        foreignKey: {
          name: 'exchange_offers_offerer_id_fkey',
          columns: ['offerer_id'],
          references: { schema: 'public', table: 'users', columns: ['id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'exchange_offers',
        foreignKey: {
          name: 'exchange_offers_offered_card_item_id_fkey',
          columns: ['offered_card_item_id'],
          references: { schema: 'public', table: 'card_items', columns: ['id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'notifications',
        foreignKey: {
          name: 'notifications_user_id_fkey',
          columns: ['user_id'],
          references: { schema: 'public', table: 'users', columns: ['id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'photo_cards',
        foreignKey: {
          name: 'photo_cards_creator_id_fkey',
          columns: ['creator_id'],
          references: { schema: 'public', table: 'users', columns: ['id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'point_histories',
        foreignKey: {
          name: 'point_histories_user_id_fkey',
          columns: ['user_id'],
          references: { schema: 'public', table: 'users', columns: ['id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'random_point_logs',
        foreignKey: {
          name: 'random_point_logs_user_id_fkey',
          columns: ['user_id'],
          references: { schema: 'public', table: 'users', columns: ['id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'refresh_tokens',
        foreignKey: {
          name: 'refresh_tokens_user_id_fkey',
          columns: ['user_id'],
          references: { schema: 'public', table: 'users', columns: ['id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'sale_listings',
        foreignKey: {
          name: 'sale_listings_seller_id_fkey',
          columns: ['seller_id'],
          references: { schema: 'public', table: 'users', columns: ['id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'sale_listings',
        foreignKey: {
          name: 'sale_listings_photo_card_id_fkey',
          columns: ['photo_card_id'],
          references: { schema: 'public', table: 'photo_cards', columns: ['id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'trades',
        foreignKey: {
          name: 'trades_seller_id_fkey',
          columns: ['seller_id'],
          references: { schema: 'public', table: 'users', columns: ['id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'trades',
        foreignKey: {
          name: 'trades_counterpart_id_fkey',
          columns: ['counterpart_id'],
          references: { schema: 'public', table: 'users', columns: ['id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'trades',
        foreignKey: {
          name: 'trades_photo_card_id_fkey',
          columns: ['photo_card_id'],
          references: { schema: 'public', table: 'photo_cards', columns: ['id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'trades',
        foreignKey: {
          name: 'trades_received_photo_card_id_fkey',
          columns: ['received_photo_card_id'],
          references: { schema: 'public', table: 'photo_cards', columns: ['id'] },
        },
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
