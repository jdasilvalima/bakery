-- Expired stock cannot go into production: an input lot must still be good on
-- the day of the production that uses it.

create function check_input_not_expired()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  v_code text;
  v_expires date;
  v_produced_on date;
begin
  select lot_code, expires_on into v_code, v_expires from lots where id = new.input_lot_id;
  select p.produced_on into v_produced_on
  from lots o
  join productions p on p.id = o.production_id
  where o.id = new.output_lot_id;

  if v_expires < v_produced_on then
    raise exception 'Lot % expired on %, it cannot be used on %', v_code, v_expires, v_produced_on;
  end if;
  return new;
end;
$$;

revoke execute on function check_input_not_expired() from public;

create trigger lot_inputs_not_expired
  before insert on lot_inputs
  for each row execute function check_input_not_expired();
