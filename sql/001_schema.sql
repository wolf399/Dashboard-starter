-- =========================
-- 001_schema.sql
-- Core database schema
-- =========================

-- Enable UUID generation
create extension if not exists "pgcrypto";

-- =========================
-- Organizations
-- =========================
create table organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz default now()
);

-- =========================
-- Users (profile linked to auth.users)
-- =========================
create table users (
  id uuid primary key references auth.users(id) on delete cascade,
  organization_id uuid references organizations(id) on delete cascade,
  role text not null check (role in ('owner', 'admin', 'agent')),
  created_at timestamptz default now()
);

-- =========================
-- Customers
-- =========================
create table customers (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references organizations(id) on delete cascade,
  name text,
  email text,
  phone text,
  created_at timestamptz default now()
);

-- =========================
-- Channels
-- =========================
create table channels (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references organizations(id) on delete cascade,
  type text not null check (type in ('email', 'whatsapp', 'instagram', 'facebook')),
  external_id text,
  created_at timestamptz default now()
);

-- =========================
-- Conversations
-- =========================
create table conversations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references organizations(id) on delete cascade,
  customer_id uuid references customers(id) on delete set null,
  channel_id uuid references channels(id) on delete set null,
  status text not null default 'open' check (status in ('open', 'pending', 'closed')),
  assigned_to uuid references users(id) on delete set null,
  last_message_at timestamptz,
  created_at timestamptz default now()
);

-- =========================
-- Messages
-- =========================
create table messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid references conversations(id) on delete cascade,
  sender_type text not null check (sender_type in ('customer', 'agent', 'system')),
  sender_id uuid,
  content text not null,
  created_at timestamptz default now()
);

-- =========================
-- Internal Notes (private team notes)
-- =========================
create table internal_notes (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid references conversations(id) on delete cascade,
  user_id uuid references users(id) on delete cascade,
  note text not null,
  created_at timestamptz default now()
);