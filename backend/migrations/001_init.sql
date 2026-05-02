-- Initial schema for Company Brain on Supabase Postgres.
-- Apply via Supabase MCP `apply_migration` or via the Supabase SQL editor.

create extension if not exists "vector";
create extension if not exists "pgcrypto";

-- ── Tenant ──────────────────────────────────────────────────────────────────

create table if not exists organizations (
    id text primary key,
    name text not null,
    created_at timestamptz not null default now()
);

-- Seed for the demo
insert into organizations (id, name)
values ('banco_demo', 'Banco Demo')
on conflict (id) do nothing;

-- ── People (canonical, denormalized — Skills File is the SoT for queries) ──

create table if not exists people (
    organization_id text not null references organizations(id) on delete cascade,
    id text not null,
    name text not null,
    email text,
    phone text,
    role text,
    area text,
    manager_id text,
    is_active boolean not null default true,
    last_interviewed_at timestamptz,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    primary key (organization_id, id)
);

create index if not exists people_org_idx on people(organization_id);
create index if not exists people_email_idx on people(organization_id, email);

-- ── Skills File (one jsonb blob per organization) ──────────────────────────

create table if not exists skills_file (
    organization_id text primary key references organizations(id) on delete cascade,
    payload jsonb not null,
    version text not null default '1.0.0',
    updated_at timestamptz not null default now()
);

-- ── Interviews ─────────────────────────────────────────────────────────────

create table if not exists interviews (
    id text primary key,                          -- Retell call_id
    organization_id text not null references organizations(id) on delete cascade,
    employee_id text not null,
    transcript jsonb not null default '[]'::jsonb,
    duration_sec numeric,
    status text not null default 'completed',     -- 'scheduled'|'in_progress'|'completed'|'failed'
    completed_at timestamptz not null default now(),
    raw_payload jsonb
);

create index if not exists interviews_org_idx on interviews(organization_id);
create index if not exists interviews_employee_idx on interviews(employee_id);

-- ── Eval runs (audit log of CI gates) ──────────────────────────────────────

create table if not exists eval_runs (
    id uuid primary key default gen_random_uuid(),
    git_sha text,
    environment text not null,
    cases_total int not null,
    cases_passed int not null,
    detail jsonb not null default '{}'::jsonb,
    ran_at timestamptz not null default now()
);

-- ── Embeddings (for future: semantic search over interview chunks) ─────────

create table if not exists interview_chunks (
    id uuid primary key default gen_random_uuid(),
    interview_id text not null references interviews(id) on delete cascade,
    organization_id text not null references organizations(id) on delete cascade,
    speaker text,
    timestamp_seconds numeric,
    text text not null,
    embedding vector(1024),                       -- voyage-3-large = 1024 dims
    created_at timestamptz not null default now()
);

create index if not exists interview_chunks_interview_idx on interview_chunks(interview_id);
-- IVFFlat index on the embedding column for vector search; tune `lists` later.
create index if not exists interview_chunks_embedding_idx
    on interview_chunks
    using ivfflat (embedding vector_cosine_ops)
    with (lists = 100);
