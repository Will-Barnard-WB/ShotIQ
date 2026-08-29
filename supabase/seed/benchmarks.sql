-- Reference benchmark bands, seeded.
-- These are the pill values the design's demo section shows, generalised per
-- club category. They are a documented starting reference, meant to be
-- replaced by real aggregated ShotIQ user data once there is enough of it.

insert into public.benchmarks
  (club_category, handicap_band, metric, min_value, max_value, label, sort_order)
values
  -- smash factor -------------------------------------------------
  ('driver','scratch',  'smash_factor', 1.48, null, 'Scratch: 1.48+',      1),
  ('driver','hcp10',    'smash_factor', 1.42, null, '10 hcp: 1.42+',       2),
  ('driver','hcp20plus','smash_factor', 1.28, 1.40, '20+ hcp: 1.28-1.40',  4),

  ('wood','scratch',    'smash_factor', 1.48, null, 'Scratch: 1.48+',      1),
  ('wood','hcp10',      'smash_factor', 1.40, null, '10 hcp: 1.40+',       2),
  ('wood','hcp20plus',  'smash_factor', 1.25, 1.35, '20+ hcp: 1.25-1.35',  4),

  ('hybrid','scratch',  'smash_factor', 1.45, null, 'Scratch: 1.45+',      1),
  ('hybrid','hcp10',    'smash_factor', 1.38, null, '10 hcp: 1.38+',       2),
  ('hybrid','hcp20plus','smash_factor', 1.22, 1.33, '20+ hcp: 1.22-1.33',  4),

  ('iron','scratch',    'smash_factor', 1.37, null, 'Scratch: 1.37+',      1),
  ('iron','hcp10',      'smash_factor', 1.29, null, '10 hcp: 1.29+',       2),
  ('iron','hcp20plus',  'smash_factor', 1.15, 1.25, '20+ hcp: 1.15-1.25',  4),

  ('wedge','scratch',   'smash_factor', 1.20, null, 'Scratch: 1.20+',      1),
  ('wedge','hcp10',     'smash_factor', 1.14, null, '10 hcp: 1.14+',       2),
  ('wedge','hcp20plus', 'smash_factor', 1.00, 1.12, '20+ hcp: 1.00-1.12',  4),

  -- club path, absolute degrees (lower is better) -----------------
  ('driver','scratch',  'club_path_abs', 0, 2.0, 'Scratch: within 2.0',    1),
  ('driver','hcp10',    'club_path_abs', 0, 4.0, '10 hcp: within 4.0',     2),
  ('driver','hcp20plus','club_path_abs', 0, 8.0, '20+ hcp: within 8.0',    4),

  ('wood','scratch',    'club_path_abs', 0, 2.0, 'Scratch: within 2.0',    1),
  ('wood','hcp10',      'club_path_abs', 0, 4.5, '10 hcp: within 4.5',     2),
  ('wood','hcp20plus',  'club_path_abs', 0, 8.5, '20+ hcp: within 8.5',    4),

  ('hybrid','scratch',  'club_path_abs', 0, 2.0, 'Scratch: within 2.0',    1),
  ('hybrid','hcp10',    'club_path_abs', 0, 4.5, '10 hcp: within 4.5',     2),
  ('hybrid','hcp20plus','club_path_abs', 0, 8.5, '20+ hcp: within 8.5',    4),

  ('iron','scratch',    'club_path_abs', 0, 3.0, 'Scratch: within 3.0',    1),
  ('iron','hcp10',      'club_path_abs', 0, 5.5, '10 hcp: within 5.5',     2),
  ('iron','hcp20plus',  'club_path_abs', 0, 10.0,'20+ hcp: within 10.0',   4),

  ('wedge','scratch',   'club_path_abs', 0, 3.0, 'Scratch: within 3.0',    1),
  ('wedge','hcp10',     'club_path_abs', 0, 5.5, '10 hcp: within 5.5',     2),
  ('wedge','hcp20plus', 'club_path_abs', 0, 10.0,'20+ hcp: within 10.0',   4),

  -- club face, absolute degrees ----------------------------------
  ('driver','scratch',  'club_face_abs', 0, 1.5, 'Scratch: within 1.5',    1),
  ('driver','hcp10',    'club_face_abs', 0, 3.0, '10 hcp: within 3.0',     2),
  ('driver','hcp20plus','club_face_abs', 0, 6.5, '20+ hcp: within 6.5',    4),

  ('wood','scratch',    'club_face_abs', 0, 1.5, 'Scratch: within 1.5',    1),
  ('wood','hcp10',      'club_face_abs', 0, 3.0, '10 hcp: within 3.0',     2),
  ('wood','hcp20plus',  'club_face_abs', 0, 6.5, '20+ hcp: within 6.5',    4),

  ('hybrid','scratch',  'club_face_abs', 0, 1.5, 'Scratch: within 1.5',    1),
  ('hybrid','hcp10',    'club_face_abs', 0, 3.0, '10 hcp: within 3.0',     2),
  ('hybrid','hcp20plus','club_face_abs', 0, 6.5, '20+ hcp: within 6.5',    4),

  ('iron','scratch',    'club_face_abs', 0, 2.0, 'Scratch: within 2.0',    1),
  ('iron','hcp10',      'club_face_abs', 0, 3.5, '10 hcp: within 3.5',     2),
  ('iron','hcp20plus',  'club_face_abs', 0, 7.0, '20+ hcp: within 7.0',    4),

  ('wedge','scratch',   'club_face_abs', 0, 2.0, 'Scratch: within 2.0',    1),
  ('wedge','hcp10',     'club_face_abs', 0, 3.5, '10 hcp: within 3.5',     2),
  ('wedge','hcp20plus', 'club_face_abs', 0, 7.0, '20+ hcp: within 7.0',    4),

  -- carry deviation, absolute yards ------------------------------
  ('driver','scratch',  'deviation_abs', 0, 12,  'Scratch: within 12 yds', 1),
  ('driver','hcp10',    'deviation_abs', 0, 22,  '10 hcp: within 22 yds',  2),
  ('driver','hcp20plus','deviation_abs', 0, 40,  '20+ hcp: within 40 yds', 4),

  ('wood','scratch',    'deviation_abs', 0, 10,  'Scratch: within 10 yds', 1),
  ('wood','hcp10',      'deviation_abs', 0, 18,  '10 hcp: within 18 yds',  2),
  ('wood','hcp20plus',  'deviation_abs', 0, 34,  '20+ hcp: within 34 yds', 4),

  ('hybrid','scratch',  'deviation_abs', 0, 9,   'Scratch: within 9 yds',  1),
  ('hybrid','hcp10',    'deviation_abs', 0, 16,  '10 hcp: within 16 yds',  2),
  ('hybrid','hcp20plus','deviation_abs', 0, 30,  '20+ hcp: within 30 yds', 4),

  ('iron','scratch',    'deviation_abs', 0, 6,   'Scratch: within 6 yds',  1),
  ('iron','hcp10',      'deviation_abs', 0, 12,  '10 hcp: within 12 yds',  2),
  ('iron','hcp20plus',  'deviation_abs', 0, 24,  '20+ hcp: within 24 yds', 4),

  ('wedge','scratch',   'deviation_abs', 0, 4,   'Scratch: within 4 yds',  1),
  ('wedge','hcp10',     'deviation_abs', 0, 8,   '10 hcp: within 8 yds',   2),
  ('wedge','hcp20plus', 'deviation_abs', 0, 16,  '20+ hcp: within 16 yds', 4)
on conflict (club_category, handicap_band, metric) do update
  set min_value = excluded.min_value,
      max_value = excluded.max_value,
      label     = excluded.label,
      sort_order= excluded.sort_order;
