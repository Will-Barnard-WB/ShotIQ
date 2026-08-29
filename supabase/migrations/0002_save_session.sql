-- Saving a session writes sessions + shots + session_club_stats. The Supabase
-- JS client cannot span a transaction across three calls, so it goes through
-- one function instead: either the whole session lands or none of it does.
--
-- security invoker, so row level security still applies and auth.uid() is the
-- caller rather than the function owner.

create or replace function public.save_session(
  p_name         text,
  p_session_date date,
  p_file_name    text,
  p_shots        jsonb,
  p_club_stats   jsonb,
  p_analysis     jsonb
) returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_session_id uuid;
  v_user uuid := auth.uid();
begin
  if v_user is null then
    raise exception 'not authenticated';
  end if;
  if p_shots is null or jsonb_array_length(p_shots) = 0 then
    raise exception 'a session needs at least one shot';
  end if;

  insert into public.sessions (user_id, session_date, name, file_name, shot_count, analysis)
  values (v_user, p_session_date, p_name, p_file_name, jsonb_array_length(p_shots), p_analysis)
  returning id into v_session_id;

  insert into public.shots (
    session_id, user_id, shot_index, hit_at, club_name, club_type_raw, club_category,
    club_speed, attack_angle, club_path, club_face, face_to_path, ball_speed, smash_factor,
    launch_angle, launch_direction, backspin, sidespin, spin_rate, spin_axis, apex_height,
    carry_distance, carry_deviation_angle, carry_deviation_distance,
    total_distance, total_deviation_angle, total_deviation_distance,
    quality, quality_source, is_short_game
  )
  select
    v_session_id, v_user, s.shot_index, s.hit_at, s.club_name, s.club_type_raw, s.club_category,
    s.club_speed, s.attack_angle, s.club_path, s.club_face, s.face_to_path, s.ball_speed, s.smash_factor,
    s.launch_angle, s.launch_direction, s.backspin, s.sidespin, s.spin_rate, s.spin_axis, s.apex_height,
    s.carry_distance, s.carry_deviation_angle, s.carry_deviation_distance,
    s.total_distance, s.total_deviation_angle, s.total_deviation_distance,
    coalesce(s.quality, 'ok'), coalesce(s.quality_source, 'auto'), coalesce(s.is_short_game, false)
  from jsonb_to_recordset(p_shots) as s(
    shot_index int, hit_at timestamptz, club_name text, club_type_raw text, club_category text,
    club_speed numeric, attack_angle numeric, club_path numeric, club_face numeric,
    face_to_path numeric, ball_speed numeric, smash_factor numeric,
    launch_angle numeric, launch_direction numeric, backspin numeric, sidespin numeric,
    spin_rate numeric, spin_axis numeric, apex_height numeric,
    carry_distance numeric, carry_deviation_angle numeric, carry_deviation_distance numeric,
    total_distance numeric, total_deviation_angle numeric, total_deviation_distance numeric,
    quality text, quality_source text, is_short_game boolean
  );

  insert into public.session_club_stats (
    session_id, user_id, session_date, club_name, club_category, is_short_game, n,
    avg_carry, avg_total, avg_club_speed, avg_ball_speed, avg_smash, avg_path, avg_face,
    avg_face_to_path, avg_attack_angle, avg_deviation, avg_abs_deviation,
    carry_stdev, carry_min, carry_max,
    good_n, bad_n, good_bad_carry_gap,
    dominant_metric, dominant_good_mean, dominant_bad_mean, dominant_effect
  )
  select
    v_session_id, v_user, p_session_date, c.club_name, c.club_category,
    coalesce(c.is_short_game, false), c.n,
    c.avg_carry, c.avg_total, c.avg_club_speed, c.avg_ball_speed, c.avg_smash, c.avg_path, c.avg_face,
    c.avg_face_to_path, c.avg_attack_angle, c.avg_deviation, c.avg_abs_deviation,
    c.carry_stdev, c.carry_min, c.carry_max,
    coalesce(c.good_n, 0), coalesce(c.bad_n, 0), c.good_bad_carry_gap,
    c.dominant_metric, c.dominant_good_mean, c.dominant_bad_mean, c.dominant_effect
  from jsonb_to_recordset(p_club_stats) as c(
    club_name text, club_category text, is_short_game boolean, n int,
    avg_carry numeric, avg_total numeric, avg_club_speed numeric, avg_ball_speed numeric,
    avg_smash numeric, avg_path numeric, avg_face numeric, avg_face_to_path numeric,
    avg_attack_angle numeric, avg_deviation numeric, avg_abs_deviation numeric,
    carry_stdev numeric, carry_min numeric, carry_max numeric,
    good_n int, bad_n int, good_bad_carry_gap numeric,
    dominant_metric text, dominant_good_mean numeric, dominant_bad_mean numeric,
    dominant_effect numeric
  );

  return v_session_id;
end;
$$;

-- Replaces a session's derived data after shots are re-tagged by hand.
create or replace function public.replace_session_analysis(
  p_session_id uuid,
  p_club_stats jsonb,
  p_analysis   jsonb
) returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_date date;
begin
  select session_date into v_date
  from public.sessions where id = p_session_id and user_id = v_user;

  if v_date is null then
    raise exception 'session not found';
  end if;

  update public.sessions set analysis = p_analysis where id = p_session_id;
  delete from public.session_club_stats where session_id = p_session_id;

  insert into public.session_club_stats (
    session_id, user_id, session_date, club_name, club_category, is_short_game, n,
    avg_carry, avg_total, avg_club_speed, avg_ball_speed, avg_smash, avg_path, avg_face,
    avg_face_to_path, avg_attack_angle, avg_deviation, avg_abs_deviation,
    carry_stdev, carry_min, carry_max,
    good_n, bad_n, good_bad_carry_gap,
    dominant_metric, dominant_good_mean, dominant_bad_mean, dominant_effect
  )
  select
    p_session_id, v_user, v_date, c.club_name, c.club_category,
    coalesce(c.is_short_game, false), c.n,
    c.avg_carry, c.avg_total, c.avg_club_speed, c.avg_ball_speed, c.avg_smash, c.avg_path, c.avg_face,
    c.avg_face_to_path, c.avg_attack_angle, c.avg_deviation, c.avg_abs_deviation,
    c.carry_stdev, c.carry_min, c.carry_max,
    coalesce(c.good_n, 0), coalesce(c.bad_n, 0), c.good_bad_carry_gap,
    c.dominant_metric, c.dominant_good_mean, c.dominant_bad_mean, c.dominant_effect
  from jsonb_to_recordset(p_club_stats) as c(
    club_name text, club_category text, is_short_game boolean, n int,
    avg_carry numeric, avg_total numeric, avg_club_speed numeric, avg_ball_speed numeric,
    avg_smash numeric, avg_path numeric, avg_face numeric, avg_face_to_path numeric,
    avg_attack_angle numeric, avg_deviation numeric, avg_abs_deviation numeric,
    carry_stdev numeric, carry_min numeric, carry_max numeric,
    good_n int, bad_n int, good_bad_carry_gap numeric,
    dominant_metric text, dominant_good_mean numeric, dominant_bad_mean numeric,
    dominant_effect numeric
  );
end;
$$;
