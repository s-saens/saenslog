-- saenslog Phase 3: profiles, posts, comments + RLS (+ auth signup trigger)
-- Apply in Supabase Dashboard → SQL Editor, or via Supabase CLI when linked.

create table if not exists public.profiles (
	id uuid primary key references auth.users (id) on delete cascade,
	username text unique not null,
	display_name text,
	avatar_url text,
	role text not null default 'member' check (role in ('admin', 'member')),
	created_at timestamptz not null default now()
);

create table if not exists public.posts (
	id bigserial primary key,
	slug text unique not null,
	title text not null,
	category text,
	tags text[] not null default '{}',
	content_md text not null,
	content_html text not null,
	word_count int not null default 0,
	author_id uuid not null references public.profiles (id),
	published boolean not null default false,
	published_at timestamptz,
	created_at timestamptz not null default now(),
	updated_at timestamptz not null default now()
);

create table if not exists public.comments (
	id bigserial primary key,
	post_slug text not null,
	author_id uuid not null references public.profiles (id) on delete cascade,
	parent_id bigint references public.comments (id) on delete cascade,
	content text not null,
	created_at timestamptz not null default now(),
	updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
alter table public.posts enable row level security;
alter table public.comments enable row level security;

create policy "profiles read" on public.profiles for select using (true);

create policy "profiles self-update" on public.profiles for update using (auth.uid() = id);

create policy "profiles self-insert" on public.profiles for insert with check (auth.uid() = id);

create policy "posts read published" on public.posts for
select using (
	published
	or exists (
		select 1
		from public.profiles p
		where
			p.id = auth.uid()
			and p.role = 'admin'
	)
);

create policy "posts admin write" on public.posts for all using (
	exists (
		select 1
		from public.profiles p
		where
			p.id = auth.uid()
			and p.role = 'admin'
	)
)
with check (
	exists (
		select 1
		from public.profiles p
		where
			p.id = auth.uid()
			and p.role = 'admin'
	)
);

create policy "comments read" on public.comments for select using (true);

create policy "comments insert" on public.comments for insert with check (auth.uid() = author_id);

create policy "comments update own" on public.comments for update using (auth.uid() = author_id);

create policy "comments delete own" on public.comments for delete using (auth.uid() = author_id);

create or replace function public.handle_new_user ()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
	base_name text;
begin
	base_name := split_part(coalesce(new.email, 'user@local'), '@', 1);
	if base_name = '' then
		base_name := 'user';
	end if;

	insert into public.profiles (id, username, display_name)
	values (new.id, base_name, base_name);

	return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
after insert on auth.users for each row
execute function public.handle_new_user ();
