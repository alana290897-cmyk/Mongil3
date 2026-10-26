import { sqliteTable, text } from 'drizzle-orm/sqlite-core';
export const records = sqliteTable('records', { id: text('id').primaryKey(), kind: text('kind').notNull(), title: text('title').notNull(), status: text('status').notNull(), author: text('author').notNull(), payload: text('payload').notNull(), updated: text('updated').notNull() });
export const members = sqliteTable('members', { email: text('email').primaryKey(), userId: text('user_id'), role: text('role').notNull(), created: text('created').notNull() });
export const settings = sqliteTable('settings', { key: text('key').primaryKey(), value: text('value').notNull() });
export const audit = sqliteTable('audit', { id: text('id').primaryKey(), actor: text('actor').notNull(), action: text('action').notNull(), target: text('target').notNull(), time: text('time').notNull() });
export const credentials = sqliteTable('credentials',{id:text('id').primaryKey(),username:text('username').notNull().unique(),email:text('email').notNull().unique(),passwordHash:text('password_hash').notNull(),salt:text('salt').notNull()});
export const sessions = sqliteTable('sessions',{tokenHash:text('token_hash').primaryKey(),userId:text('user_id').notNull(),expires:text('expires').notNull()});
export const attempts = sqliteTable('attempts',{key:text('key').primaryKey(),count:text('count').notNull(),until:text('until').notNull()});
