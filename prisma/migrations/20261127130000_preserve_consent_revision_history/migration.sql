-- Preserve consent revisions as append-only evidence. Existing rows are retained.
CREATE OR REPLACE FUNCTION guard_consent_revision_history()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'consent revisions are append-only; capture a new consent identity';
END;
$$;
CREATE TRIGGER consent_revisions_append_only
BEFORE UPDATE OR DELETE ON "consent_revisions"
FOR EACH ROW EXECUTE FUNCTION guard_consent_revision_history();
