-- Existing usage rows remain intact with NULL request_id; future requests are unique per user.
ALTER TABLE AI_CHAT_USAGE
    ADD COLUMN request_id CHAR(36) NULL AFTER user_id,
    ADD UNIQUE KEY uq_ai_chat_usage_user_request (user_id, request_id);