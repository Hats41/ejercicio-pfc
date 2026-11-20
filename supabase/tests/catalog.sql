begin;
insert into public.collection_points (slug,name,district,hours,latitude,longitude)
  values ('qa-unpublished','QA privado','Surco','Sin horario',-12,-77);
insert into public.collection_point_materials values ('qa-unpublished','Metal');
set local role anon;
do $$
begin
  if (select count(*) from public.collection_points where is_demo) < 5
     or not exists (select 1 from public.collection_point_materials where point_slug = 'surco' and material = 'Plástico') then
    raise exception 'El catálogo público está incompleto';
  end if;
  if exists (select 1 from public.collection_points where slug = 'qa-unpublished')
     or exists (select 1 from public.collection_point_materials where point_slug = 'qa-unpublished') then
    raise exception 'El catálogo expone datos sin publicar';
  end if;
  if has_table_privilege(current_user, 'public.collection_points', 'INSERT, UPDATE, DELETE')
     or has_table_privilege('authenticated', 'public.collection_point_materials', 'INSERT, UPDATE, DELETE') then
    raise exception 'Un cliente puede escribir en el catálogo';
  end if;
end $$;
rollback;
