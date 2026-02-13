# Quick Fix Guide: Utility Requests RLS Policy

## ⚠️ ACTION REQUIRED

This PR fixes the Row-Level Security (RLS) policy error for utility requests, but **you must apply the database migration** for the fix to take effect.

## Problem
Users with the `USER` role cannot create utility requests. They get this error:
```
new row violates row-level security policy for table "utility_requests"
```

## Solution
Migration file `0140_fix_utility_requests_insert_policy_add_user_role.sql` has been created to fix the RLS policy by adding the `USER` role to the allowed roles list.

## 🚀 Quick Apply (Choose One Method)

### Method 1: Using Supabase CLI (Fastest)
```bash
npx supabase db push
```

### Method 2: Using Supabase Dashboard
1. Go to [Supabase Dashboard](https://app.supabase.com)
2. Select your project (hhhzugqimtypijkdxxsm)
3. Click **SQL Editor** in the left sidebar
4. Copy the content from `supabase/migrations/0140_fix_utility_requests_insert_policy_add_user_role.sql`
5. Paste into the SQL editor
6. Click **Run** button

### Method 3: Copy-Paste SQL
If you have direct database access, run this SQL:
```sql
DROP POLICY IF EXISTS "Utility requests: insert" ON public.utility_requests;

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

## ✅ Testing the Fix

After applying the migration:

1. **Login** as a user with role = `USER`
2. **Navigate** to the Procurement page
3. **Fill out** the utility request form
4. **Submit** the form
5. **Expected Result:** ✅ Request created successfully (no error)

## 📚 More Information

- **FIX_SUMMARY.md** - Complete details about the fix
- **MIGRATION_GUIDE_0140.md** - Detailed migration instructions with multiple methods
- **SUPABASE_SETUP.md** - General Supabase configuration guide

## 🔒 Security

✅ **Security Validated:** CodeQL scan passed with no vulnerabilities  
✅ **User Isolation:** Users can only create requests for themselves  
✅ **Role-Based Access:** Only approved roles can create requests

## ❓ Need Help?

If you encounter issues:
1. Verify the migration was applied by checking the Supabase Dashboard
2. Check the user's role in the `profiles` table
3. Review Supabase logs for error details
4. Refer to the troubleshooting section in `SUPABASE_SETUP.md`

---

**Ready to apply?** Choose one of the methods above and run it now! ⬆️
