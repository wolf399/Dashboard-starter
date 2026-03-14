-- Enable RLS on all tables
alter table organizations enable row level security;
alter table users enable row level security;
alter table customers enable row level security;
alter table channels enable row level security;
alter table conversations enable row level security;
alter table messages enable row level security;
alter table internal_notes enable row level security;

-- Users policy
create policy "users can access own org"
on users
for all
using (
  organization_id = (
    select organization_id from users where id = auth.uid()
  )
);

-- Customers policy
create policy "customers per org"
on customers
for all
using (
  organization_id = (
    select organization_id from users where id = auth.uid()
  )
);

-- Channels policy
create policy "channels per org"
on channels
for all
using (
  organization_id = (
    select organization_id from users where id = auth.uid()
  )
);

-- Conversations policy
create policy "conversations per org"
on conversations
for all
using (
  organization_id = (
    select organization_id from users where id = auth.uid()
  )
);

-- Messages policy
create policy "messages via conversation org"
on messages
for all
using (
  conversation_id in (
    select id from conversations
    where organization_id = (
      select organization_id from users where id = auth.uid()
    )
  )
);

-- Internal notes policy
create policy "notes via conversation org"
on internal_notes
for all
using (
  conversation_id in (
    select id from conversations
    where organization_id = (
      select organization_id from users where id = auth.uid()
    )
  )
);