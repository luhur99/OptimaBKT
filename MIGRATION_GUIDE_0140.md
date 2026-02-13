# Migration 0140: Fix Utility Requests Insert Policy

## Problem
Users with the `USER` role are unable to create utility requests due to a Row-Level Security (RLS) policy violation. The error message is:

```
new row violates row-level security policy for table "utility_requests"
```

## Root Cause
The INSERT policy for the `utility_requests` table was only allowing users with roles:
- `SUPER_ADMIN`
- `OPERASIONAL_DIV`
- `SALES_DIV`

However, the application UI and business logic expect that users with the `USER` role should also be able to create utility requests for themselves.

## Solution
Migration `0140_fix_utility_requests_insert_policy_add_user_role.sql` updates the RLS INSERT policy to include the `USER` role.

## How to Apply This Migration

### Option 1: Using Supabase CLI (Recommended)

1. **Install Supabase CLI** (if not already installed):
   ```bash
   # For macOS/Linux
   brew install supabase/tap/supabase
   
   # For Windows (using Scoop)
   scoop bucket add supabase https://github.com/supabase/scoop-bucket.git
   scoop install supabase
   ```

2. **Link your project** (first time only):
   ```bash
   npx supabase link --project-ref hhhzugqimtypijkdxxsm
   ```
   
   You'll be prompted for your Supabase access token. Get it from:
   - Go to https://app.supabase.com/account/tokens
   - Generate a new token if needed
   - Paste it when prompted

3. **Push the migration**:
   ```bash
   npx supabase db push
   ```

### Option 2: Using Supabase Dashboard

1. Go to your Supabase Dashboard: https://app.supabase.com
2. Select your project (`hhhzugqimtypijkdxxsm`)
3. Navigate to **SQL Editor**
4. Copy and paste the contents of `supabase/migrations/0140_fix_utility_requests_insert_policy_add_user_role.sql`
5. Click **Run** to execute the migration

### Option 3: Manual SQL Execution

Connect to your Supabase database using any PostgreSQL client and run:

```sql
-- Drop the existing restrictive INSERT policy
DROP POLICY IF EXISTS "Utility requests: insert" ON public.utility_requests;

-- Create the updated INSERT policy that includes USER role
CREATE POLICY "Utility requests: insert" ON public.utility_requests
  FOR INSERT TO authenticated
  WITH CHECK (
    user_id IS NOT NULL AND auth.uid() = user_id AND
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() 
      AND role IN ('SUPER_ADMIN', 'OPERASIONAL_DIV', 'SALES_DIV', 'USER')
    )
  );
```

## Verification

After applying the migration, test that:

1. **Users with USER role can create utility requests:**
   - Login as a user with role `USER`
   - Navigate to the Procurement page
   - Fill out and submit the utility request form
   - Verify no RLS errors occur

2. **Other roles still work:**
   - Test with `SUPER_ADMIN`, `OPERASIONAL_DIV`, and `SALES_DIV` roles
   - Ensure they can still create utility requests

3. **Security is maintained:**
   - Users can only create requests for themselves (user_id must match auth.uid())
   - Only authenticated users with the specified roles can insert records

## Impact
- **Affected Users**: All users with `USER` role who need to create utility requests
- **Risk Level**: Low - This is an additive change that expands permissions without removing existing ones
- **Downtime**: None - The migration can be applied while the system is running

## Rollback
If you need to rollback this change:

```sql
-- Drop the current policy
DROP POLICY IF EXISTS "Utility requests: insert" ON public.utility_requests;

-- Restore the previous policy (without USER role)
CREATE POLICY "Utility requests: insert" ON public.utility_requests
  FOR INSERT TO authenticated
  WITH CHECK (
    user_id IS NOT NULL AND auth.uid() = user_id AND
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() 
      AND role IN ('SUPER_ADMIN', 'OPERASIONAL_DIV', 'SALES_DIV')
    )
  );
```

## Related Files
- Migration: `supabase/migrations/0140_fix_utility_requests_insert_policy_add_user_role.sql`
- Form Component: `src/components/procurement/CreateUtilityRequestForm.tsx`
- Page Component: `src/pages/operasional/procurement/UtilityRequestPage.tsx`
- Original Migration: `supabase/migrations/0139_create_utility_requests_table_and_ur_number.sql`
