import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import DashboardLayout from '@/layouts/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CheckCircle2, XCircle, RefreshCw, Database, Lock, Table } from 'lucide-react';
import { useAuthSession } from '@/hooks/auth-session';

interface ConnectionTest {
  name: string;
  status: 'pending' | 'success' | 'error';
  message: string;
  icon: React.ReactNode;
}

function SupabaseTestPage() {
  const { session, profile } = useAuthSession();
  const [tests, setTests] = useState<ConnectionTest[]>([
    {
      name: 'Environment Variables',
      status: 'pending',
      message: 'Checking configuration...',
      icon: <Database className="h-5 w-5" />,
    },
    {
      name: 'Supabase Connection',
      status: 'pending',
      message: 'Testing connection...',
      icon: <Database className="h-5 w-5" />,
    },
    {
      name: 'Authentication',
      status: 'pending',
      message: 'Checking auth status...',
      icon: <Lock className="h-5 w-5" />,
    },
    {
      name: 'Database Access',
      status: 'pending',
      message: 'Testing database query...',
      icon: <Table className="h-5 w-5" />,
    },
  ]);
  const [isRunning, setIsRunning] = useState(false);

  const runTests = useCallback(async () => {
    setIsRunning(true);
    const newTests = [...tests];

    // Test 1: Environment Variables
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

    if (supabaseUrl && supabaseKey) {
      newTests[0] = {
        ...newTests[0],
        status: 'success',
        message: `URL: ${supabaseUrl.substring(0, 30)}...`,
      };
    } else {
      newTests[0] = {
        ...newTests[0],
        status: 'error',
        message: 'Missing environment variables in .env file',
      };
    }
    setTests([...newTests]);

    // Test 2: Supabase Connection
    try {
      const { data, error } = await supabase.from('profiles').select('count', { count: 'exact', head: true });
      
      if (error) throw error;
      
      newTests[1] = {
        ...newTests[1],
        status: 'success',
        message: 'Connected successfully to Supabase',
      };
    } catch (error: any) {
      newTests[1] = {
        ...newTests[1],
        status: 'error',
        message: `Connection error: ${error.message}`,
      };
    }
    setTests([...newTests]);

    // Test 3: Authentication
    if (session && session.user) {
      newTests[2] = {
        ...newTests[2],
        status: 'success',
        message: `Authenticated as: ${session.user.email}`,
      };
    } else {
      newTests[2] = {
        ...newTests[2],
        status: 'error',
        message: 'Not authenticated. Please log in.',
      };
    }
    setTests([...newTests]);

    // Test 4: Database Access (profiles table)
    if (session && session.user) {
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single();

        if (error) throw error;

        newTests[3] = {
          ...newTests[3],
          status: 'success',
          message: `Profile loaded: ${data.full_name} (${data.role})`,
        };
      } catch (error: any) {
        newTests[3] = {
          ...newTests[3],
          status: 'error',
          message: `Database query error: ${error.message}`,
        };
      }
    } else {
      newTests[3] = {
        ...newTests[3],
        status: 'error',
        message: 'Cannot test database access without authentication',
      };
    }
    setTests([...newTests]);

    setIsRunning(false);
  }, [session, profile]);

  useEffect(() => {
    runTests();
  }, [runTests]);

  const allTestsPassed = tests.every((test) => test.status === 'success');

  return (
    <DashboardLayout>
      <div className="container mx-auto p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-neon-cyan mb-2">Supabase Connection Test</h1>
            <p className="text-gray-400">Verify your Supabase connection and configuration</p>
          </div>
          <Button
            onClick={runTests}
            disabled={isRunning}
            className="bg-electric-violet hover:bg-electric-violet/80"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isRunning ? 'animate-spin' : ''}`} />
            Run Tests
          </Button>
        </div>

        <Card className="border-neon-cyan/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              Overall Status
              {allTestsPassed && !isRunning && (
                <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
                  All Tests Passed
                </Badge>
              )}
              {!allTestsPassed && !isRunning && (
                <Badge className="bg-red-500/20 text-red-400 border-red-500/30">
                  Some Tests Failed
                </Badge>
              )}
              {isRunning && (
                <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30">
                  Running...
                </Badge>
              )}
            </CardTitle>
            <CardDescription>
              Connection tests help verify that your Supabase integration is working correctly.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {tests.map((test, index) => (
              <div
                key={index}
                className="flex items-start gap-4 p-4 rounded-lg border border-gray-700 bg-gray-800/50"
              >
                <div className="mt-1">
                  {test.status === 'success' && (
                    <CheckCircle2 className="h-6 w-6 text-green-400" />
                  )}
                  {test.status === 'error' && <XCircle className="h-6 w-6 text-red-400" />}
                  {test.status === 'pending' && (
                    <RefreshCw className="h-6 w-6 text-gray-400 animate-spin" />
                  )}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    {test.icon}
                    <h3 className="font-semibold text-white">{test.name}</h3>
                  </div>
                  <p className="text-sm text-gray-400">{test.message}</p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="border-neon-cyan/30">
          <CardHeader>
            <CardTitle>Connection Information</CardTitle>
            <CardDescription>Your current Supabase configuration</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h4 className="text-sm font-medium text-gray-400 mb-1">Supabase URL</h4>
                <p className="text-sm font-mono bg-gray-800 p-2 rounded border border-gray-700">
                  {import.meta.env.VITE_SUPABASE_URL || 'Not configured'}
                </p>
              </div>
              <div>
                <h4 className="text-sm font-medium text-gray-400 mb-1">Authentication Status</h4>
                <p className="text-sm font-mono bg-gray-800 p-2 rounded border border-gray-700">
                  {session ? `Logged in as ${session.user.email}` : 'Not authenticated'}
                </p>
              </div>
              {profile && (
                <>
                  <div>
                    <h4 className="text-sm font-medium text-gray-400 mb-1">User Profile</h4>
                    <p className="text-sm font-mono bg-gray-800 p-2 rounded border border-gray-700">
                      {profile.full_name}
                    </p>
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-gray-400 mb-1">User Role</h4>
                    <p className="text-sm font-mono bg-gray-800 p-2 rounded border border-gray-700">
                      {profile.role}
                    </p>
                  </div>
                </>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="border-neon-cyan/30">
          <CardHeader>
            <CardTitle>Troubleshooting Tips</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="text-sm text-gray-400 space-y-2">
              <p>
                <strong className="text-white">If environment variables test fails:</strong>
              </p>
              <ul className="list-disc list-inside ml-4 space-y-1">
                <li>Ensure your <code className="bg-gray-800 px-1 py-0.5 rounded">.env</code> file exists in the root directory</li>
                <li>Verify <code className="bg-gray-800 px-1 py-0.5 rounded">VITE_SUPABASE_URL</code> and <code className="bg-gray-800 px-1 py-0.5 rounded">VITE_SUPABASE_ANON_KEY</code> are set</li>
                <li>Restart your development server after changing environment variables</li>
              </ul>
              <p className="mt-3">
                <strong className="text-white">If connection test fails:</strong>
              </p>
              <ul className="list-disc list-inside ml-4 space-y-1">
                <li>Check your internet connection</li>
                <li>Verify your Supabase project is active in the Supabase dashboard</li>
                <li>Ensure the Supabase URL is correct</li>
              </ul>
              <p className="mt-3">
                <strong className="text-white">If authentication test fails:</strong>
              </p>
              <ul className="list-disc list-inside ml-4 space-y-1">
                <li>Log in through the <a href="/login" className="text-neon-cyan hover:underline">/login</a> page</li>
                <li>Verify your credentials are correct</li>
              </ul>
              <p className="mt-3">
                <strong className="text-white">If database access test fails:</strong>
              </p>
              <ul className="list-disc list-inside ml-4 space-y-1">
                <li>Ensure your database tables are created (run migrations if needed)</li>
                <li>Check Row Level Security (RLS) policies in your Supabase dashboard</li>
                <li>Verify your user has the correct permissions</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}

export default SupabaseTestPage;
