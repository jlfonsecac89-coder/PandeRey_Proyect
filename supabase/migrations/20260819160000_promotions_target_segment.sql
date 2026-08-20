alter table promotions
  add column target_segment text
  check (target_segment in ('estrella', 'leal', 'promedio', 'dormido', 'perdido'));

comment on column promotions.target_segment is
  'Segmento RFM al que se restringe el cupón (null = sin restricción, aplica a cualquier cliente). Validado server-side contra customer_rfm_snapshot en discount.ts al aplicar el cupón.';
