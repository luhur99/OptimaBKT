# Supabase Connection Guide

This document explains how to connect your OptimaBKT application to your Supabase account.

## Current Status

✅ **Your application is already configured to connect to Supabase!**

The Supabase integration is fully set up with:
- Supabase client configured
- Authentication system implemented
- Environment variables in place
- Database migrations ready

## Verifying Your Connection

### Option 1: Use the Connection Test Page

1. Start your development server:
   ```bash
   npm run dev
   ```

2. Navigate to: [http://localhost:5173/supabase-test](http://localhost:5173/supabase-test)

3. The test page will automatically check:
   - Environment variables configuration
   - Connection to Supabase
   - Authentication status
   - Database access

### Option 2: Test via Login

1. Start your development server:
   ```bash
   npm run dev
   ```

2. Navigate to: [http://localhost:5173/login](http://localhost:5173/login)

3. Try logging in with your Supabase credentials

## Configuration Details

### Environment Variables

Your Supabase connection is configured via environment variables in the `.env` file:

```env
VITE_SUPABASE_URL="your-supabase-project-url"
VITE_SUPABASE_ANON_KEY="your-supabase-anon-key"
```

**Current Configuration:**
- URL: `https://hhhzugqimtypijkdxxsm.supabase.co`
- Anon Key: Configured (hidden for security)

### Supabase Client

The Supabase client is initialized in `/src/integrations/supabase/client.ts`:

```typescript
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
```

## Using Supabase in Your Code

### Importing the Client

```typescript
import { supabase } from '@/integrations/supabase/client';
```

### Example: Querying Data

```typescript
// Fetch all profiles
const { data, error } = await supabase
  .from('profiles')
  .select('*');

if (error) {
  console.error('Error:', error);
} else {
  console.log('Data:', data);
}
```

### Example: Authentication

```typescript
// Sign in
const { data, error } = await supabase.auth.signInWithPassword({
  email: 'user@example.com',
  password: 'password',
});

// Sign out
await supabase.auth.signOut();

// Get current session
const { data: { session } } = await supabase.auth.getSession();
```

### Example: Inserting Data

```typescript
const { data, error } = await supabase
  .from('your_table')
  .insert([
    { column1: 'value1', column2: 'value2' }
  ]);
```

### Example: Updating Data

```typescript
const { data, error } = await supabase
  .from('your_table')
  .update({ column1: 'new_value' })
  .eq('id', 123);
```

## Connecting to a Different Supabase Account

If you want to connect to a different Supabase account:

1. **Get Your Credentials from Supabase Dashboard:**
   - Go to [https://app.supabase.com](https://app.supabase.com)
   - Select your project
   - Go to Settings → API
   - Copy your "Project URL" and "anon/public" key

2. **Update Your `.env` File:**
   ```env
   VITE_SUPABASE_URL="your-new-project-url"
   VITE_SUPABASE_ANON_KEY="your-new-anon-key"
   ```

3. **Restart Your Development Server:**
   ```bash
   # Stop the server (Ctrl+C)
   # Start it again
   npm run dev
   ```

4. **Verify the Connection:**
   - Visit [http://localhost:5173/supabase-test](http://localhost:5173/supabase-test)
   - Run the connection tests

## Database Setup

### Running Migrations

The `/supabase/migrations` directory contains all database schema definitions. To apply them:

1. **Install Supabase CLI:**
   ```bash
   npm install -g supabase
   ```

2. **Link Your Project:**
   ```bash
   supabase link --project-ref your-project-ref
   ```

3. **Push Migrations:**
   ```bash
   supabase db push
   ```

### Required Tables

The application expects these tables:
- `profiles` - User profiles and roles
- `scheduling_requests` - Scheduling requests
- `delivery_orders` - Delivery orders
- `invoices` - Invoice data
- `invoice_items` - Invoice line items
- `products` - Product catalog
- `inventory_ledger` - Inventory tracking
- `purchase_orders` - Purchase orders
- `purchase_requests` - Purchase requests
- And more...

## Authentication Setup

### User Roles

The application supports these roles:
- `SUPER_ADMIN` - Full system access
- `OPERASIONAL_DIV` - Operational division access
- `SALES_DIV` - Sales division access
- `TECHNICIAN` - Technician access
- `ACCOUNTING` - Accounting access
- `USER` - Basic user access

### Creating Users

1. **Via Supabase Dashboard:**
   - Go to Authentication → Users
   - Click "Add User"
   - Enter email and password

2. **Create Profile Entry:**
   After creating a user in auth, add their profile:
   ```sql
   INSERT INTO profiles (id, full_name, role, email)
   VALUES (
     'auth-user-id',
     'John Doe',
     'USER',
     'john@example.com'
   );
   ```

## Troubleshooting

### Connection Errors

**Error: "Supabase URL and Anon Key must be provided"**
- Check that your `.env` file exists
- Verify variable names start with `VITE_`
- Restart your development server

**Error: "Failed to fetch"**
- Check your internet connection
- Verify the Supabase URL is correct
- Check if your Supabase project is active

### Authentication Errors

**Error: "Invalid login credentials"**
- Verify the email and password
- Check if the user exists in Supabase Dashboard

**Error: "User not found in profiles"**
- Ensure a profile record exists for the authenticated user
- Check the `profiles` table in your database

### Database Errors

**Error: "relation does not exist"**
- Run database migrations
- Verify tables are created in Supabase Dashboard

**Error: "permission denied"**
- Check Row Level Security (RLS) policies
- Verify user has correct role permissions

## Additional Resources

- [Supabase Documentation](https://supabase.com/docs)
- [Supabase JavaScript Client](https://supabase.com/docs/reference/javascript/introduction)
- [React with Supabase](https://supabase.com/docs/guides/getting-started/quickstarts/reactjs)

## Need Help?

If you're still having trouble:
1. Check the [Supabase Test Page](http://localhost:5173/supabase-test) for specific errors
2. Review the browser console for error messages
3. Check the network tab in browser dev tools
4. Verify your Supabase project is active and not paused
