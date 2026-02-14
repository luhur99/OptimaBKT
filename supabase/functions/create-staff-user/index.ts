import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

// Set ALLOWED_ORIGIN in Supabase edge function secrets to restrict to your production domain.
// Example: supabase secrets set ALLOWED_ORIGIN=https://your-app.vercel.app
const corsHeaders = {
  'Access-Control-Allow-Origin': Deno.env.get('ALLOWED_ORIGIN') ?? '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const authHeader = req.headers.get('Authorization') ?? '';
  if (!authHeader) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // Use anon client with user's token to validate auth
  const supabaseClient = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_ANON_KEY') ?? '',
    {
      global: {
        headers: { Authorization: authHeader },
      },
    }
  );

  // Admin client for privileged operations (bypasses RLS)
  const supabaseAdminClient = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );

  try {
    // Get the user session from the request
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();

    if (userError || !user) {
      console.error('Auth error:', userError);
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check if the authenticated user is a SUPER_ADMIN (use admin client to bypass RLS)
    const { data: profile, error: profileError } = await supabaseAdminClient
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profileError) {
      console.error('Profile fetch error:', profileError);
      return new Response(JSON.stringify({ error: 'Failed to verify user role.' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (profile?.role !== 'SUPER_ADMIN') {
      return new Response(JSON.stringify({ error: 'Forbidden: Only SUPER_ADMIN can create staff users.' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { email, password, full_name, role } = await req.json();

    const VALID_ROLES = ['SUPER_ADMIN', 'OPERASIONAL_DIV', 'SALES_DIV', 'TECHNICIAN', 'ACCOUNTING', 'STAFF', 'USER'];

    if (!email || !password || !full_name || !role) {
      return new Response(JSON.stringify({ error: 'Missing required fields: email, password, full_name, role' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!VALID_ROLES.includes(role)) {
      return new Response(JSON.stringify({ error: `Invalid role. Must be one of: ${VALID_ROLES.join(', ')}` }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Create the new user using admin client.
    // NOTE: The handle_new_user trigger always inserts role='USER' regardless of metadata.
    // We must explicitly UPDATE the profile role after creation.
    const { data: newUser, error: createUserError } = await supabaseAdminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Skip email verification
      user_metadata: { full_name },
    });

    if (createUserError) {
      return new Response(JSON.stringify({ error: createUserError.message }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Explicitly set the role using the service role key (bypasses RLS).
    // The trigger already created the profile row with role='USER'; we now correct it.
    const { error: updateRoleError } = await supabaseAdminClient
      .from('profiles')
      .update({ role })
      .eq('id', newUser.user.id);

    if (updateRoleError) {
      // Roll back: delete the auth user so we don't leave an orphaned user with wrong role.
      await supabaseAdminClient.auth.admin.deleteUser(newUser.user.id);
      return new Response(JSON.stringify({ error: 'Failed to assign role. User creation rolled back: ' + updateRoleError.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ message: 'Staff user created successfully', user: newUser.user }), {
      status: 201,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error creating staff user:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});