begin;

create table public.collection_points (
  slug text primary key,
  name text not null,
  district text not null,
  hours text not null,
  latitude numeric(8,5) not null check (latitude between -90 and 90),
  longitude numeric(8,5) not null check (longitude between -180 and 180),
  is_demo boolean not null default true,
  is_published boolean not null default false
);

create table public.collection_point_materials (
  point_slug text not null references public.collection_points(slug) on delete cascade,
  material text not null check (material in ('Papel','Cartón','Plástico','Vidrio','Metal','Electrónicos')),
  primary key (point_slug, material)
);

alter table public.collection_points enable row level security;
alter table public.collection_point_materials enable row level security;
revoke all on public.collection_points, public.collection_point_materials from public, anon, authenticated;
grant select on public.collection_points, public.collection_point_materials to anon, authenticated;
create policy read_published_points on public.collection_points for select to anon, authenticated using (is_published);
create policy read_published_point_materials on public.collection_point_materials for select to anon, authenticated
  using (exists (select 1 from public.collection_points where slug = point_slug and is_published));

insert into public.collection_points (slug,name,district,hours,latitude,longitude,is_published) values
  ('barranco','Acopio demostrativo · Barranco','Barranco','Lun–vie · 09:00–16:00',-12.14960,-77.02100,true),
  ('la-molina','Acopio demostrativo · La Molina','La Molina','Mar–sáb · 09:00–17:00',-12.07810,-76.92880,true),
  ('lima','Acopio demostrativo · Lima Cercado','Lima Cercado','Lun–sáb · 08:00–13:00',-12.04640,-77.04280,true),
  ('miraflores','Acopio demostrativo · Miraflores','Miraflores','Lun–vie · 10:00–17:00',-12.12190,-77.03060,true),
  ('surco','Acopio demostrativo · Surco','Surco','Sáb–dom · 08:00–12:00',-12.14550,-77.00620,true);

insert into public.collection_point_materials values
  ('barranco','Vidrio'),('barranco','Metal'),
  ('la-molina','Papel'),('la-molina','Cartón'),('la-molina','Plástico'),
  ('lima','Cartón'),('lima','Metal'),('lima','Electrónicos'),
  ('miraflores','Papel'),('miraflores','Cartón'),('miraflores','Plástico'),('miraflores','Vidrio'),
  ('surco','Plástico'),('surco','Metal');

notify pgrst, 'reload schema';
commit;
