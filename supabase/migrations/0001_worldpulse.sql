-- WorldPulse database schema for Supabase (PostgreSQL).
--
-- Security model
--  * Supabase Auth owns passwords (bcrypt). WorldPulse never stores plaintext passwords.
--  * Row Level Security is enabled on EVERY table.
--  * Players may READ their own rows. No table grants INSERT/UPDATE/DELETE to the anon or
--    authenticated roles: all writes go through the Next.js server using the service-role key,
--    after server-side validation, via the wp_save_player() function (one transaction).
--  * Quiz answer keys (quiz_questions) are never readable by clients.

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------- reference data
create table if not exists public.countries (
  id text primary key,                 -- ISO 3166-1 alpha-3 (or WorldPulse code for special areas)
  iso2 text,
  name text not null,
  official_name text,
  capital text,
  region text,
  subregion text,
  population bigint,
  government text,
  gdp_usd_bn numeric,
  disputed boolean not null default false,
  note text,
  data jsonb not null default '{}'::jsonb,
  verified_at date,
  updated_at timestamptz not null default now()
);

create table if not exists public.political_figures (
  id text primary key,
  name text not null,
  country_id text references public.countries(id),
  organization text,
  position text not null,
  role text not null,
  affiliation text,
  in_office_since date,
  bio text,
  policies jsonb not null default '[]'::jsonb,
  relevance text,
  portrait jsonb,
  verified_at date not null,
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------- news
create table if not exists public.news_articles (
  id text primary key,
  publication text not null check (publication in ('Bloomberg','BBC News','The Wall Street Journal','Reuters','NPR','The New York Times')),
  headline text not null,
  url text not null unique,
  feed_summary text,
  published_at timestamptz not null,
  feed text,
  event_id text,
  fetched_at timestamptz not null default now()
);

create table if not exists public.news_events (
  id text primary key,
  title text not null,
  category text not null,
  countries text[] not null default '{}',
  figures text[] not null default '{}',
  lat double precision not null,
  lng double precision not null,
  region text,
  event_date timestamptz not null,
  updated_at timestamptz not null default now(),
  importance_score int not null check (importance_score between 0 and 100),
  importance_tier text not null,
  importance_breakdown jsonb not null,
  briefing jsonb not null,
  is_demo boolean not null default false,
  quiz_id text,
  active boolean not null default true
);
create index if not exists news_events_active_idx on public.news_events (active, importance_score desc);

create table if not exists public.event_sources (
  id text primary key,
  event_id text not null references public.news_events(id) on delete cascade,
  article_id text references public.news_articles(id),
  publication text not null,
  headline text not null,
  url text,
  published_at timestamptz not null
);

create table if not exists public.quizzes (
  id text primary key,
  event_id text not null references public.news_events(id) on delete cascade,
  category text not null,
  validated_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.quiz_questions (
  id text primary key,
  quiz_id text not null references public.quizzes(id) on delete cascade,
  position int not null,
  type text not null,
  prompt text not null,
  choices jsonb not null,
  answer_index int not null,
  explanation text not null,
  context text,
  country_ids jsonb,
  figure_ids jsonb,
  evidence text not null
);

create table if not exists public.app_meta (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------- players
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text not null unique check (username ~ '^[A-Za-z0-9_.-]{3,20}$'),
  avatar jsonb not null,
  coins int not null default 0 check (coins >= 0),
  xp int not null default 0 check (xp >= 0),
  streak jsonb not null,
  equipped jsonb not null,
  daily jsonb not null,
  missions jsonb not null,
  stats jsonb not null,
  category_quizzes jsonb not null default '{}'::jsonb,
  pending_quiz jsonb,
  version int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.shop_items (
  id text primary key,
  name text not null,
  slot text not null,
  rarity text not null check (rarity in ('common','uncommon','rare','epic','legendary')),
  price int not null check (price >= 0),
  min_rank int not null default 0,
  rank_reward boolean not null default false,
  data jsonb not null default '{}'::jsonb
);

create table if not exists public.player_inventory (
  user_id uuid not null references public.profiles(id) on delete cascade,
  item_id text not null,
  acquired_at timestamptz not null default now(),
  primary key (user_id, item_id)
);

create table if not exists public.achievements (
  id text primary key,
  name text not null,
  description text not null,
  coins int not null,
  xp int not null
);

create table if not exists public.player_achievements (
  user_id uuid not null references public.profiles(id) on delete cascade,
  achievement_id text not null,
  unlocked_at timestamptz not null default now(),
  primary key (user_id, achievement_id)
);

create table if not exists public.daily_missions (
  user_id uuid not null references public.profiles(id) on delete cascade,
  day date not null,
  mission_ids text[] not null,
  claimed text[] not null default '{}',
  primary key (user_id, day)
);

create table if not exists public.quiz_progress (
  user_id uuid not null references public.profiles(id) on delete cascade,
  quiz_id text not null,
  best_correct int not null,
  total int not null,
  attempts int not null,
  perfect boolean not null,
  coins_awarded int not null,
  xp_awarded int not null,
  first_completed_at timestamptz not null,
  last_attempt_at timestamptz not null,
  primary key (user_id, quiz_id)
);

create table if not exists public.quiz_attempts (
  id uuid primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  quiz_id text not null,
  event_id text not null,
  answers jsonb not null,
  correct int not null,
  total int not null,
  coins int not null,
  xp int not null,
  created_at timestamptz not null default now()
);
create index if not exists quiz_attempts_user_idx on public.quiz_attempts (user_id, created_at desc);

create table if not exists public.currency_transactions (
  id uuid primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  kind text not null,
  coins int not null,
  ref text,
  note text,
  created_at timestamptz not null default now()
);
create index if not exists currency_tx_user_idx on public.currency_transactions (user_id, created_at desc);

create table if not exists public.experience_events (
  id uuid primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  kind text not null,
  xp int not null,
  ref text,
  note text,
  created_at timestamptz not null default now()
);

create table if not exists public.countries_explored (
  user_id uuid not null references public.profiles(id) on delete cascade,
  country_id text not null,
  explored_at timestamptz not null default now(),
  primary key (user_id, country_id)
);

create table if not exists public.figures_viewed (
  user_id uuid not null references public.profiles(id) on delete cascade,
  figure_id text not null,
  viewed_at timestamptz not null default now(),
  primary key (user_id, figure_id)
);

create table if not exists public.briefings_completed (
  user_id uuid not null references public.profiles(id) on delete cascade,
  event_id text not null,
  completed_at timestamptz not null default now(),
  primary key (user_id, event_id)
);

create table if not exists public.password_reset_tokens (
  token_hash text primary key,
  user_id uuid not null,
  expires_at timestamptz not null
);

-- ---------------------------------------------------------------- row level security
do $$
declare t text;
begin
  foreach t in array array['countries','political_figures','news_articles','news_events','event_sources','quizzes','quiz_questions','app_meta',
    'profiles','shop_items','player_inventory','achievements','player_achievements','daily_missions','quiz_progress','quiz_attempts',
    'currency_transactions','experience_events','countries_explored','figures_viewed','briefings_completed','password_reset_tokens']
  loop
    execute format('alter table public.%I enable row level security', t);
  end loop;
end $$;

-- Public, read-only reference and news data (answer keys excluded).
create policy "read countries" on public.countries for select using (true);
create policy "read figures" on public.political_figures for select using (true);
create policy "read articles" on public.news_articles for select using (true);
create policy "read events" on public.news_events for select using (true);
create policy "read sources" on public.event_sources for select using (true);
create policy "read quizzes" on public.quizzes for select using (true);
create policy "read shop" on public.shop_items for select using (true);
create policy "read achievement defs" on public.achievements for select using (true);
create policy "read meta" on public.app_meta for select using (true);
-- quiz_questions and password_reset_tokens: no client policies at all (server only).

-- Players can read only their own rows.
create policy "own profile" on public.profiles for select using (auth.uid() = id);
create policy "own inventory" on public.player_inventory for select using (auth.uid() = user_id);
create policy "own achievements" on public.player_achievements for select using (auth.uid() = user_id);
create policy "own missions" on public.daily_missions for select using (auth.uid() = user_id);
create policy "own quiz progress" on public.quiz_progress for select using (auth.uid() = user_id);
create policy "own attempts" on public.quiz_attempts for select using (auth.uid() = user_id);
create policy "own transactions" on public.currency_transactions for select using (auth.uid() = user_id);
create policy "own xp" on public.experience_events for select using (auth.uid() = user_id);
create policy "own explored" on public.countries_explored for select using (auth.uid() = user_id);
create policy "own figures" on public.figures_viewed for select using (auth.uid() = user_id);
create policy "own briefings" on public.briefings_completed for select using (auth.uid() = user_id);

-- ---------------------------------------------------------------- player state functions
-- Assemble the full player state as JSON (shape matches PlayerState in src/lib/types.ts).
create or replace function public.wp_load_player(p_user uuid) returns jsonb
language sql stable security definer set search_path = public as $$
  select case when p.id is null then null else jsonb_build_object(
    'userId', p.id, 'username', p.username, 'avatar', p.avatar, 'coins', p.coins, 'xp', p.xp,
    'streak', p.streak, 'equipped', p.equipped, 'daily', p.daily, 'missions', p.missions,
    'stats', p.stats, 'categoryQuizzes', p.category_quizzes, 'pendingQuiz', p.pending_quiz, 'createdAt', p.created_at, 'version', p.version,
    'inventory', coalesce((select jsonb_agg(item_id order by acquired_at) from player_inventory where user_id = p.id), '[]'::jsonb),
    'achievements', coalesce((select jsonb_object_agg(achievement_id, unlocked_at) from player_achievements where user_id = p.id), '{}'::jsonb),
    'countriesExplored', coalesce((select jsonb_agg(country_id order by explored_at) from countries_explored where user_id = p.id), '[]'::jsonb),
    'figuresViewed', coalesce((select jsonb_agg(figure_id order by viewed_at) from figures_viewed where user_id = p.id), '[]'::jsonb),
    'briefingsRead', coalesce((select jsonb_agg(event_id order by completed_at) from briefings_completed where user_id = p.id), '[]'::jsonb),
    'quizRecords', coalesce((select jsonb_object_agg(quiz_id, jsonb_build_object(
        'bestCorrect', best_correct, 'total', total, 'attempts', attempts, 'perfect', perfect,
        'coinsAwarded', coins_awarded, 'xpAwarded', xp_awarded,
        'firstCompletedAt', first_completed_at, 'lastAttemptAt', last_attempt_at))
      from quiz_progress where user_id = p.id), '{}'::jsonb)
  ) end
  from (select p_user as uid) x left join profiles p on p.id = x.uid;
$$;

-- Save the full player state atomically with optimistic concurrency.
-- Returns false if the stored version does not match p_expected (caller retries).
create or replace function public.wp_save_player(p_state jsonb, p_expected int, p_ledger jsonb, p_attempt jsonb)
returns boolean language plpgsql security definer set search_path = public as $$
declare
  uid uuid := (p_state->>'userId')::uuid;
  rows int;
  k text; v jsonb; l jsonb;
begin
  if p_expected = -1 then
    insert into profiles (id, username, avatar, coins, xp, streak, equipped, daily, missions, stats, category_quizzes, pending_quiz, version, created_at)
    values (uid, p_state->>'username', p_state->'avatar', (p_state->>'coins')::int, (p_state->>'xp')::int, p_state->'streak',
            p_state->'equipped', p_state->'daily', p_state->'missions', p_state->'stats', p_state->'categoryQuizzes', p_state->'pendingQuiz',
            (p_state->>'version')::int, (p_state->>'createdAt')::timestamptz)
    on conflict (id) do nothing;
  else
    update profiles set username = p_state->>'username', avatar = p_state->'avatar', coins = (p_state->>'coins')::int,
      xp = (p_state->>'xp')::int, streak = p_state->'streak', equipped = p_state->'equipped', daily = p_state->'daily',
      missions = p_state->'missions', stats = p_state->'stats', category_quizzes = p_state->'categoryQuizzes',
      pending_quiz = p_state->'pendingQuiz', version = (p_state->>'version')::int, updated_at = now()
    where id = uid and version = p_expected;
  end if;
  get diagnostics rows = row_count;
  if rows = 0 then return false; end if;

  insert into player_inventory (user_id, item_id) select uid, jsonb_array_elements_text(p_state->'inventory') on conflict do nothing;
  insert into countries_explored (user_id, country_id) select uid, jsonb_array_elements_text(p_state->'countriesExplored') on conflict do nothing;
  insert into figures_viewed (user_id, figure_id) select uid, jsonb_array_elements_text(p_state->'figuresViewed') on conflict do nothing;
  insert into briefings_completed (user_id, event_id) select uid, jsonb_array_elements_text(p_state->'briefingsRead') on conflict do nothing;
  for k, v in select * from jsonb_each(p_state->'achievements') loop
    insert into player_achievements (user_id, achievement_id, unlocked_at) values (uid, k, (v #>> '{}')::timestamptz) on conflict do nothing;
  end loop;
  for k, v in select * from jsonb_each(p_state->'quizRecords') loop
    insert into quiz_progress values (uid, k, (v->>'bestCorrect')::int, (v->>'total')::int, (v->>'attempts')::int, (v->>'perfect')::boolean,
      (v->>'coinsAwarded')::int, (v->>'xpAwarded')::int, (v->>'firstCompletedAt')::timestamptz, (v->>'lastAttemptAt')::timestamptz)
    on conflict (user_id, quiz_id) do update set best_correct = excluded.best_correct, total = excluded.total, attempts = excluded.attempts,
      perfect = excluded.perfect, coins_awarded = excluded.coins_awarded, xp_awarded = excluded.xp_awarded, last_attempt_at = excluded.last_attempt_at;
  end loop;
  insert into daily_missions (user_id, day, mission_ids, claimed)
  values (uid, (p_state->'missions'->>'day')::date,
          array(select jsonb_array_elements_text(p_state->'missions'->'ids')),
          array(select jsonb_array_elements_text(p_state->'missions'->'claimed')))
  on conflict (user_id, day) do update set claimed = excluded.claimed;

  for l in select * from jsonb_array_elements(coalesce(p_ledger, '[]'::jsonb)) loop
    if (l->>'coins')::int <> 0 then
      insert into currency_transactions (id, user_id, kind, coins, ref, note, created_at)
      values ((l->>'id')::uuid, uid, l->>'kind', (l->>'coins')::int, l->>'ref', l->>'note', (l->>'at')::timestamptz);
    end if;
    if (l->>'xp')::int <> 0 then
      insert into experience_events (id, user_id, kind, xp, ref, note, created_at)
      values (gen_random_uuid(), uid, l->>'kind', (l->>'xp')::int, l->>'ref', l->>'note', (l->>'at')::timestamptz);
    end if;
  end loop;

  if p_attempt is not null then
    insert into quiz_attempts (id, user_id, quiz_id, event_id, answers, correct, total, coins, xp, created_at)
    values ((p_attempt->>'id')::uuid, uid, p_attempt->>'quizId', p_attempt->>'eventId', p_attempt->'answers',
            (p_attempt->>'correct')::int, (p_attempt->>'total')::int, (p_attempt->>'coins')::int, (p_attempt->>'xp')::int,
            (p_attempt->>'at')::timestamptz);
  end if;
  return true;
end $$;

revoke all on function public.wp_load_player(uuid) from public, anon, authenticated;
revoke all on function public.wp_save_player(jsonb, int, jsonb, jsonb) from public, anon, authenticated;
