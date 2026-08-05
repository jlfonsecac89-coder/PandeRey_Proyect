-- La tabla `customer_rfm_snapshot` y su RLS ya se crearon en la migración
-- base de loyalty (20260804001100) junto con el resto del modelo de datos —
-- acá solo se agrega el índice de lectura y la función de recálculo que
-- faltaban para que el módulo de la Fase 11 funcione de verdad.
create index if not exists customer_rfm_snapshot_user_computed_idx
  on customer_rfm_snapshot (user_id, computed_at desc);

-- Recalcula el segmento RFM+LTV de cada cliente con al menos un pedido no
-- cancelado/pendiente. Inserta una fila nueva por cliente en cada corrida
-- (no sobreescribe) para poder ver la evolución en el tiempo (sección 14).
--
-- Los puntajes r/f/m son quintiles (NTILE(5)) sobre la base de clientes
-- activa en esa corrida — la escala es relativa a la cartera actual, no un
-- umbral fijo. El blueprint (sección 14) define los 5 segmentos solo de
-- forma cualitativa; la siguiente heurística es la interpretación concreta
-- usada acá, documentada porque no hay una única forma "correcta":
--   estrella  = r,f,m todos altos (>=4)
--   leal      = compra seguido y gasta bien (f,m >=4) sin necesitar r alto
--   perdido   = ausencia larga Y frecuencia/monto bajos (r,f,m todos <=2)
--   dormido   = ausente (r<=2) pero historialmente bueno (f o m >=3)
--   promedio  = cualquier otra combinación intermedia
create or replace function public.recompute_customer_rfm(p_window_days int)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v_inserted int;
begin
  with base as (
    select
      o.user_id,
      extract(day from now() - max(o.created_at))::int as recency_days,
      count(*) filter (
        where o.created_at >= now() - (p_window_days || ' days')::interval
      ) as frequency_count,
      coalesce(sum(o.total) filter (
        where o.created_at >= now() - (p_window_days || ' days')::interval
      ), 0) as monetary_total,
      coalesce(sum(o.total), 0) as ltv_total
    from orders o
    where o.status not in ('pending_payment', 'cancelled')
    group by o.user_id
  ),
  scored as (
    select
      user_id, recency_days, frequency_count, monetary_total, ltv_total,
      (6 - ntile(5) over (order by recency_days))::smallint as r_score,
      ntile(5) over (order by frequency_count)::smallint as f_score,
      ntile(5) over (order by monetary_total)::smallint as m_score
    from base
  ),
  segmented as (
    select *,
      case
        when r_score >= 4 and f_score >= 4 and m_score >= 4 then 'estrella'
        when f_score >= 4 and m_score >= 4 then 'leal'
        when r_score <= 2 and f_score <= 2 and m_score <= 2 then 'perdido'
        when r_score <= 2 and (f_score >= 3 or m_score >= 3) then 'dormido'
        else 'promedio'
      end as segment
    from scored
  )
  insert into customer_rfm_snapshot (
    user_id, recency_days, frequency_count, monetary_total, ltv_total,
    r_score, f_score, m_score, segment, suggested_action
  )
  select
    user_id, recency_days, frequency_count, monetary_total, ltv_total,
    r_score, f_score, m_score, segment,
    case segment
      when 'estrella' then 'premiar'
      when 'leal' then 'premiar'
      when 'promedio' then 'impulsar_venta'
      when 'dormido' then 'retener'
      else 'activar'
    end
  from segmented;

  get diagnostics v_inserted = row_count;
  return v_inserted;
end;
$$;

-- Solo se llama con service_role (cron semanal, sección 06) — no se otorga
-- a authenticated, evita que cualquier sesión de staff dispare recálculos
-- costosos a demanda. REVOKE ALL FROM PUBLIC también le quita el acceso
-- implícito a service_role (no es superusuario en Supabase), así que hay
-- que volver a otorgárselo explícitamente.
revoke all on function public.recompute_customer_rfm(int) from public, anon, authenticated;
grant execute on function public.recompute_customer_rfm(int) to service_role;
