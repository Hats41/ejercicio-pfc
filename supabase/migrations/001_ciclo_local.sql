begin;

create table public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role text not null check (role in ('neighbor','collector'))
);

create table public.offers (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(user_id) on delete cascade,
  collector_id uuid references public.profiles(user_id) on delete restrict,
  material text not null check (material in ('Papel','Cartón','Plástico','Vidrio','Metal','Electrónicos')),
  district text not null check (district in ('Barranco','La Molina','Lima Cercado','Miraflores','Surco')),
  kg numeric not null check (kg between 0.1 and 200 and scale(kg) <= 1),
  state text not null default 'available' check (state in ('available','reserved','collected','cancelled')),
  created_at timestamptz not null default now(),
  check ((collector_id is null) = (state in ('available','cancelled'))),
  check (collector_id is distinct from owner_id)
);

alter table public.profiles enable row level security;
alter table public.offers enable row level security;
revoke all on public.profiles, public.offers from anon, authenticated;

create function public.choose_profile(p_role text) returns text
language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := auth.uid();
  chosen text;
begin
  if uid is null or p_role is null or p_role not in ('neighbor','collector') then
    raise exception 'Perfil inválido' using errcode = '42501';
  end if;
  insert into public.profiles (user_id, role) values (uid, p_role) on conflict do nothing;
  select role into chosen from public.profiles where user_id = uid;
  return chosen;
end;
$$;

create function public.my_profile() returns text
language sql stable security definer set search_path = '' as $$
  select role from public.profiles where user_id = auth.uid();
$$;

create function public.publish_offer(p_material text,p_district text,p_kg numeric) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := auth.uid();
  offer_id uuid;
begin
  if public.my_profile() is distinct from 'neighbor' then
    raise exception 'Solo el vecino puede publicar' using errcode = '42501';
  end if;
  insert into public.offers (owner_id,material,district,kg)
  values (uid,p_material,p_district,p_kg) returning id into offer_id;
  return offer_id;
end;
$$;

create function public.change_offer(p_offer uuid,p_action text) returns void
language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := auth.uid();
  actor_role text := public.my_profile();
begin
  if actor_role = 'collector' and p_action = 'reserve' then
    update public.offers set state='reserved',collector_id=uid
    where id=p_offer and state='available' and owner_id<>uid;
  elsif actor_role = 'collector' and p_action = 'collect' then
    update public.offers set state='collected'
    where id=p_offer and state='reserved' and collector_id=uid;
  elsif actor_role = 'neighbor' and p_action = 'cancel' then
    update public.offers set state='cancelled'
    where id=p_offer and state='available' and owner_id=uid;
  else
    raise exception 'Acción no autorizada' using errcode = '42501';
  end if;
  if not found then
    raise exception 'La oferta no admite esa operación' using errcode = '42501';
  end if;
end;
$$;

create view public.offers_public with (security_barrier = true) as
select id,material,district,kg,state,created_at,
       case when owner_id=auth.uid() then owner_id end as owner_id,
       case when collector_id=auth.uid() then collector_id end as collector_id
from public.offers
where auth.uid() is not null
  and (state='available' or owner_id=auth.uid() or collector_id=auth.uid());

revoke all on public.offers_public from public, anon, authenticated;
grant select on public.offers_public to authenticated;
revoke all on function public.choose_profile(text),public.my_profile(),
  public.publish_offer(text,text,numeric),public.change_offer(uuid,text)
  from public, anon, authenticated;
grant execute on function public.choose_profile(text),public.my_profile(),
  public.publish_offer(text,text,numeric),public.change_offer(uuid,text) to authenticated;
commit;
