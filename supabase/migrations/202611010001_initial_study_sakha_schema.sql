-- Study Sakha initial schema.
-- Schema only: no seed data, demo accounts, storage buckets, or content migration.

create table public.exams (
  id text primary key,
  name text not null,
  short_name text not null,
  color text,
  aspirants_label text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.subjects (
  id text primary key,
  name text not null,
  icon text,
  color text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.subject_exams (
  subject_id text not null references public.subjects(id) on delete cascade,
  exam_id text not null references public.exams(id) on delete cascade,
  primary key (subject_id, exam_id)
);

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null,
  email text,
  exam_id text references public.exams(id) on delete set null,
  plan text not null default 'Free' check (plan in ('Free', 'Pro', 'Elite')),
  status text not null default 'active' check (status in ('active', 'suspended')),
  joined_at timestamptz not null default now(),
  avatar_path text,
  streak integer check (streak is null or streak >= 0),
  tests_count integer check (tests_count is null or tests_count >= 0),
  average_score numeric,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.user_roles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role text not null check (role in ('learner', 'admin')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.uploaded_files (
  id uuid primary key default gen_random_uuid(),
  bucket_name text not null,
  object_path text not null unique,
  original_name text,
  mime_type text,
  byte_size bigint check (byte_size is null or byte_size >= 0),
  checksum text,
  width integer check (width is null or width >= 0),
  height integer check (height is null or height >= 0),
  uploaded_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table public.resources (
  id uuid primary key default gen_random_uuid(),
  legacy_id text unique,
  resource_type text not null check (resource_type in ('note', 'book', 'pyq-set')),
  title text not null,
  subject_id text references public.subjects(id) on delete set null,
  exam_id text not null references public.exams(id) on delete restrict,
  author text,
  pages integer check (pages is null or pages >= 0),
  reading_minutes integer check (reading_minutes is null or reading_minutes >= 0),
  rating numeric check (rating is null or rating between 0 and 5),
  download_count integer not null default 0 check (download_count >= 0),
  tags text[] not null default '{}',
  summary text,
  folder text,
  body text[] not null default '{}',
  toc text[],
  updated_on date,
  status text not null default 'draft' check (status in ('draft', 'pending', 'published', 'unpublished', 'rejected')),
  sort_order integer not null default 0,
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.resource_files (
  resource_id uuid not null references public.resources(id) on delete cascade,
  file_id uuid not null references public.uploaded_files(id) on delete restrict,
  file_role text not null check (file_role in ('cover', 'pdf', 'image', 'attachment')),
  sort_order integer not null default 0,
  primary key (resource_id, file_id, file_role)
);

create table public.pyq_sets (
  id uuid primary key default gen_random_uuid(),
  legacy_id text unique,
  title text not null,
  exam_id text not null references public.exams(id) on delete restrict,
  year integer,
  subject_id text references public.subjects(id) on delete set null,
  paper text,
  status text not null default 'draft' check (status in ('draft', 'pending', 'published', 'unpublished', 'rejected')),
  sort_order integer not null default 0,
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.pyq_questions (
  id uuid primary key default gen_random_uuid(),
  legacy_id text unique,
  set_id uuid not null references public.pyq_sets(id) on delete cascade,
  exam_id text not null references public.exams(id) on delete restrict,
  year integer,
  subject_id text references public.subjects(id) on delete set null,
  difficulty text check (difficulty in ('Easy', 'Moderate', 'Hard')),
  question text not null,
  options jsonb not null default '[]'::jsonb,
  answer_index integer not null,
  explanation text,
  paper text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (jsonb_typeof(options) = 'array'),
  check (answer_index >= 0)
);

create table public.tests (
  id uuid primary key default gen_random_uuid(),
  legacy_id text unique,
  title text not null,
  exam_id text not null references public.exams(id) on delete restrict,
  kind text not null check (kind in ('Full Mock', 'Sectional', 'Daily Quiz', 'Live')),
  duration_minutes integer check (duration_minutes is null or duration_minutes >= 0),
  marks_per_question numeric,
  negative_marks numeric check (negative_marks is null or negative_marks >= 0),
  attempt_count integer not null default 0 check (attempt_count >= 0),
  live_at timestamptz,
  status text not null default 'draft' check (status in ('draft', 'pending', 'published', 'unpublished', 'rejected')),
  sort_order integer not null default 0,
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.test_sections (
  id uuid primary key default gen_random_uuid(),
  test_id uuid not null references public.tests(id) on delete cascade,
  name text not null,
  question_count integer check (question_count is null or question_count >= 0),
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint test_sections_id_test_id_key unique (id, test_id)
);

create table public.test_questions (
  id uuid primary key default gen_random_uuid(),
  legacy_id text unique,
  test_id uuid not null references public.tests(id) on delete cascade,
  section_id uuid,
  section_name text,
  subject_id text references public.subjects(id) on delete set null,
  question text not null,
  options jsonb not null default '[]'::jsonb,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (jsonb_typeof(options) = 'array'),
  constraint test_questions_section_same_test_fk
    foreign key (section_id, test_id)
    references public.test_sections(id, test_id)
    on delete restrict
);

create table public.test_question_answers (
  test_question_id uuid primary key references public.test_questions(id) on delete cascade,
  answer_index integer not null,
  explanation text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (answer_index >= 0)
);

create table public.current_affairs (
  id uuid primary key default gen_random_uuid(),
  legacy_id text unique,
  title text not null,
  published_on date not null,
  category text,
  summary text,
  read_minutes integer check (read_minutes is null or read_minutes >= 0),
  status text not null default 'draft' check (status in ('draft', 'pending', 'published', 'unpublished', 'rejected')),
  sort_order integer not null default 0,
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.current_affair_points (
  id uuid primary key default gen_random_uuid(),
  current_affair_id uuid not null references public.current_affairs(id) on delete cascade,
  point_text text not null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.current_affair_exams (
  current_affair_id uuid not null references public.current_affairs(id) on delete cascade,
  exam_id text not null references public.exams(id) on delete cascade,
  primary key (current_affair_id, exam_id)
);

create table public.announcements (
  id uuid primary key default gen_random_uuid(),
  legacy_id text unique,
  title text not null,
  body text not null,
  audience_type text not null default 'all' check (audience_type in ('all', 'exam', 'plan')),
  audience_exam_id text references public.exams(id) on delete set null,
  audience_plan text check (audience_plan is null or audience_plan in ('Free', 'Pro', 'Elite')),
  status text not null default 'draft' check (status in ('draft', 'published', 'unpublished')),
  sort_order integer not null default 0,
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (
    (audience_type = 'all' and audience_exam_id is null and audience_plan is null)
    or (audience_type = 'exam' and audience_exam_id is not null and audience_plan is null)
    or (audience_type = 'plan' and audience_exam_id is null and audience_plan is not null)
  )
);

create table public.app_feature_config (
  key text primary key,
  enabled boolean not null default false,
  config jsonb not null default '{}'::jsonb,
  environment text not null default 'production',
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (jsonb_typeof(config) = 'object')
);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.user_roles
    where user_id = auth.uid()
      and role = 'admin'
  );
$$;

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to anon, authenticated;

create trigger exams_set_updated_at before update on public.exams
for each row execute function public.set_updated_at();
create trigger subjects_set_updated_at before update on public.subjects
for each row execute function public.set_updated_at();
create trigger profiles_set_updated_at before update on public.profiles
for each row execute function public.set_updated_at();
create trigger user_roles_set_updated_at before update on public.user_roles
for each row execute function public.set_updated_at();
create trigger uploaded_files_set_updated_at before update on public.uploaded_files
for each row execute function public.set_updated_at();
create trigger resources_set_updated_at before update on public.resources
for each row execute function public.set_updated_at();
create trigger pyq_sets_set_updated_at before update on public.pyq_sets
for each row execute function public.set_updated_at();
create trigger pyq_questions_set_updated_at before update on public.pyq_questions
for each row execute function public.set_updated_at();
create trigger tests_set_updated_at before update on public.tests
for each row execute function public.set_updated_at();
create trigger test_sections_set_updated_at before update on public.test_sections
for each row execute function public.set_updated_at();
create trigger test_questions_set_updated_at before update on public.test_questions
for each row execute function public.set_updated_at();
create trigger test_question_answers_set_updated_at before update on public.test_question_answers
for each row execute function public.set_updated_at();
create trigger current_affairs_set_updated_at before update on public.current_affairs
for each row execute function public.set_updated_at();
create trigger current_affair_points_set_updated_at before update on public.current_affair_points
for each row execute function public.set_updated_at();
create trigger announcements_set_updated_at before update on public.announcements
for each row execute function public.set_updated_at();
create trigger app_feature_config_set_updated_at before update on public.app_feature_config
for each row execute function public.set_updated_at();

alter table public.exams enable row level security;
alter table public.subjects enable row level security;
alter table public.subject_exams enable row level security;
alter table public.profiles enable row level security;
alter table public.user_roles enable row level security;
alter table public.uploaded_files enable row level security;
alter table public.resources enable row level security;
alter table public.resource_files enable row level security;
alter table public.pyq_sets enable row level security;
alter table public.pyq_questions enable row level security;
alter table public.tests enable row level security;
alter table public.test_sections enable row level security;
alter table public.test_questions enable row level security;
alter table public.test_question_answers enable row level security;
alter table public.current_affairs enable row level security;
alter table public.current_affair_points enable row level security;
alter table public.current_affair_exams enable row level security;
alter table public.announcements enable row level security;
alter table public.app_feature_config enable row level security;

create policy exams_public_read on public.exams
for select to anon, authenticated using (true);

create policy subjects_public_read on public.subjects
for select to anon, authenticated using (true);

create policy subject_exams_public_read on public.subject_exams
for select to anon, authenticated using (true);

create policy exams_admin_write on public.exams
for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy subjects_admin_write on public.subjects
for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy subject_exams_admin_write on public.subject_exams
for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy profiles_self_read on public.profiles
for select to authenticated using (id = auth.uid() or public.is_admin());

create policy profiles_self_insert on public.profiles
for insert to authenticated with check (id = auth.uid());

create policy profiles_self_update on public.profiles
for update to authenticated using (id = auth.uid() or public.is_admin())
with check (id = auth.uid() or public.is_admin());

create policy profiles_admin_delete on public.profiles
for delete to authenticated using (public.is_admin());

-- There are intentionally no client policies for user_roles. Role assignment is trusted/server-side only.

create policy uploaded_files_admin_only on public.uploaded_files
for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy resources_public_published_read on public.resources
for select to anon, authenticated using (status = 'published');

create policy resources_admin_write on public.resources
for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy resource_files_public_published_read on public.resource_files
for select to anon, authenticated using (
  exists (
    select 1 from public.resources r
    where r.id = resource_id and r.status = 'published'
  )
);

create policy resource_files_admin_write on public.resource_files
for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy pyq_sets_public_published_read on public.pyq_sets
for select to anon, authenticated using (status = 'published');

create policy pyq_sets_admin_write on public.pyq_sets
for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy pyq_questions_public_published_read on public.pyq_questions
for select to anon, authenticated using (
  exists (
    select 1 from public.pyq_sets s
    where s.id = set_id and s.status = 'published'
  )
);

create policy pyq_questions_admin_write on public.pyq_questions
for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy tests_public_published_read on public.tests
for select to anon, authenticated using (status = 'published');

create policy tests_admin_write on public.tests
for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy test_sections_public_published_read on public.test_sections
for select to anon, authenticated using (
  exists (
    select 1 from public.tests t
    where t.id = test_id and t.status = 'published'
  )
);

create policy test_sections_admin_write on public.test_sections
for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy test_questions_public_published_read on public.test_questions
for select to anon, authenticated using (
  exists (
    select 1 from public.tests t
    where t.id = test_id and t.status = 'published'
  )
);

create policy test_questions_admin_write on public.test_questions
for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy test_question_answers_admin_only on public.test_question_answers
for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy current_affairs_public_published_read on public.current_affairs
for select to anon, authenticated using (status = 'published');

create policy current_affairs_admin_write on public.current_affairs
for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy current_affair_points_public_published_read on public.current_affair_points
for select to anon, authenticated using (
  exists (
    select 1 from public.current_affairs c
    where c.id = current_affair_id and c.status = 'published'
  )
);

create policy current_affair_points_admin_write on public.current_affair_points
for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy current_affair_exams_public_published_read on public.current_affair_exams
for select to anon, authenticated using (
  exists (
    select 1 from public.current_affairs c
    where c.id = current_affair_id and c.status = 'published'
  )
);

create policy current_affair_exams_admin_write on public.current_affair_exams
for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy announcements_public_published_read on public.announcements
for select to anon, authenticated using (status = 'published');

create policy announcements_admin_write on public.announcements
for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy app_feature_config_authenticated_read on public.app_feature_config
for select to authenticated using (true);

create policy app_feature_config_admin_write on public.app_feature_config
for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- Keep role assignment outside the client-facing grants. These grants allow published
-- reads and self-service profile creation/updates while RLS remains authoritative.
revoke all on table public.user_roles from anon, authenticated;
grant select on table public.exams, public.subjects, public.subject_exams to anon, authenticated;
grant select on table public.resources, public.resource_files, public.pyq_sets, public.pyq_questions,
  public.tests, public.test_sections, public.test_questions, public.current_affairs,
  public.current_affair_points, public.current_affair_exams, public.announcements to anon, authenticated;
grant select on table public.app_feature_config to authenticated;
grant select on table public.profiles to authenticated;
grant insert (id, display_name, exam_id, avatar_path) on table public.profiles to authenticated;
grant update (display_name, exam_id, avatar_path) on table public.profiles to authenticated;
grant all on table public.uploaded_files to authenticated;
grant all on table public.resources, public.resource_files, public.pyq_sets, public.pyq_questions,
  public.tests, public.test_sections, public.test_questions, public.test_question_answers, public.current_affairs,
  public.current_affair_points, public.current_affair_exams, public.announcements,
  public.exams, public.subjects, public.subject_exams, public.app_feature_config to authenticated;
