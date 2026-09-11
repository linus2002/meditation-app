-- Circles: let visitors browse open circles before they have an account.
--
-- "Find your circle" lists circles *before* anyone signs in — an anonymous
-- account is only created when the reader taps Join. The original policy
-- allowed reading circles to the `authenticated` role only, so the intake
-- flow, running as `anon`, got back zero rows and every combination of
-- answers showed "No circle meets at a good time for you yet".
--
-- Visitors see open, listed circles and nothing else: no members, no sits,
-- no answers. Closed, merged and (phase 2) invite-only circles stay hidden.
-- This policy deliberately does not call is_circle_member(), which the anon
-- role is not allowed to execute.

create policy "circles: visitors browse open" on public.circles
  for select to anon
  using (status = 'open' and visibility = 'listed');
