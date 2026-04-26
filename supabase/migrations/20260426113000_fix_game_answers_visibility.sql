drop policy if exists "Session participants can view answers" on public.game_answers;

create policy "Session participants can view answers"
  on public.game_answers
  for select
  using (
    session_id in (
      select gs.id
      from public.game_sessions gs
      join public.couples c on c.id = gs.couple_id
      where c.partner1_id = (select auth.uid())
         or c.partner2_id = (select auth.uid())
    )
    and (
      user_id = (select auth.uid())
      or exists (
        select 1
        from public.game_rounds gr
        where gr.id = game_answers.round_id
          and gr.status = 'revealed'
      )
    )
  );
