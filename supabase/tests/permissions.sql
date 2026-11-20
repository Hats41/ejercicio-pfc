begin;

insert into auth.users (id, email) values
  ('63ad9568-3585-4109-8290-cb662739c001','sql-neighbor@example.invalid'),
  ('63ad9568-3585-4109-8290-cb662739c002','sql-collector@example.invalid'),
  ('63ad9568-3585-4109-8290-cb662739c003','sql-other@example.invalid');

set local role authenticated;
do $$
declare
  neighbor constant uuid := '63ad9568-3585-4109-8290-cb662739c001';
  collector constant uuid := '63ad9568-3585-4109-8290-cb662739c002';
  other_user constant uuid := '63ad9568-3585-4109-8290-cb662739c003';
  offer_id uuid;
begin
  perform set_config('request.jwt.claim.sub',neighbor::text,true);
  if public.choose_profile('neighbor') is distinct from 'neighbor' then raise exception 'Perfil vecino'; end if;
  if public.choose_profile('collector') is distinct from 'neighbor' then raise exception 'Cambio de rol indebido'; end if;
  offer_id := public.publish_offer('Metal','Surco',2.5);

  perform set_config('request.jwt.claim.sub',collector::text,true);
  perform public.choose_profile('collector');
  if not exists (select 1 from public.offers_public where id=offer_id and owner_id is null) then
    raise exception 'La oferta debería estar visible sin ID ajeno';
  end if;
  begin
    perform public.publish_offer('Metal','Surco',1);
    raise exception 'Recolector pudo publicar';
  exception when insufficient_privilege then null; end;
  perform public.change_offer(offer_id,'reserve');

  perform set_config('request.jwt.claim.sub',other_user::text,true);
  perform public.choose_profile('collector');
  if exists (select 1 from public.offers_public where id=offer_id) then raise exception 'Fuga de oferta reservada'; end if;
  begin
    perform public.change_offer(offer_id,'reserve');
    raise exception 'Doble reserva';
  exception when insufficient_privilege then null; end;
  begin
    perform public.change_offer(offer_id,'collect');
    raise exception 'Tercero pudo confirmar retiro';
  exception when insufficient_privilege then null; end;

  perform set_config('request.jwt.claim.sub',collector::text,true);
  perform public.change_offer(offer_id,'collect');
  if not exists (select 1 from public.offers_public where id=offer_id and state='collected') then raise exception 'Retiro no confirmado'; end if;

  perform set_config('request.jwt.claim.sub',neighbor::text,true);
  if not exists (select 1 from public.offers_public where id=offer_id and state='collected') then raise exception 'Historial del vecino incorrecto'; end if;
end;
$$;
rollback;
select 'OK: roles, privacidad, reserva única y confirmación; datos revertidos' as prueba;
