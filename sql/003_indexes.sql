create index on conversations (organization_id, last_message_at desc);
create index on messages (conversation_id, created_at);