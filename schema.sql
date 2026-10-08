create table birthdays (
  id bigint generated always as identity primary key,
  name text not null,
  month smallint not null check (month between 1 and 12),
  day smallint not null check (day between 1 and 31),
  created_at timestamptz default now()
);
create unique index birthdays_unique on birthdays (lower(name), month, day);

create table sent_log (sent_on date primary key);

-- Only the server (service key) touches these tables
alter table birthdays enable row level security;
alter table sent_log enable row level security;
