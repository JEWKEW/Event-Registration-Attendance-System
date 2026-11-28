-- SR-01 Sprint 2 domain integrity backstop constraints (BR-13, BR-16)
-- Note: cancel_reason, cancelled_at, checked_in_at, and checked_in_by columns
-- were already created in 0001_init.
-- Note (v1.1): "reason required when cancelling" is enforced in F-10 service/Zod
-- rather than a DB NOT NULL CHECK so pre-existing 0001_init rows and unmodified
-- Sprint 1 tests (TEST-26, TEST-35) remain 100% backward compatible.

ALTER TABLE "events"
  ADD CONSTRAINT "chk_cancel_reason_len"
  CHECK ("cancel_reason" IS NULL OR char_length(btrim("cancel_reason")) BETWEEN 1 AND 500);

ALTER TABLE "registrations"
  ADD CONSTRAINT "chk_checkin_active_only"
  CHECK ("checked_in_at" IS NULL OR "status" = 'ACTIVE');
