# Database migrations

For a new Supabase project, run `schema.sql` in the Supabase SQL editor, then
create the private Storage bucket `procurement-documents`.

For the original MVP schema, run `001_product_contract.sql` once, then deploy
the matching API version.  The migration changes persisted request statuses
from legacy uppercase values to the lower-case client contract; deploy the API
in the same release window.

The backend uses `SUPABASE_SERVICE_ROLE_KEY`, so storage and database RLS are
enabled as a guard against accidental anon-key use.  Do not expose that key to
the browser.  If direct browser access is ever introduced, add organisation
policies before issuing an anon key.
