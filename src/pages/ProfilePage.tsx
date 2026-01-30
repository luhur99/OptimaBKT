"use client";

import React from 'react';
import DashboardLayout from '@/layouts/DashboardLayout'; // Assuming DashboardLayout is the main layout
import { useAuthSession } from '@/hooks/use-auth-session';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { User } from 'lucide-react';

const ProfilePage = () => {
  const { profile, isLoading } = useAuthSession();

  if (isLoading) {
    return (
      <div className="container mx-auto py-10 text-gray-300">
        Loading profile...
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="container mx-auto py-10 text-red-400">
        No profile data found. Please log in.
      </div>
    );
  }

  return (
    <div className="container mx-auto py-10">
      <h1 className="text-3xl font-bold mb-6 text-neon-cyan">Your Profile</h1>
      <Card className="glassmorphism border border-electric-violet/30">
        <CardHeader className="flex flex-row items-center gap-4">
          <Avatar className="h-20 w-20 border-2 border-neon-cyan">
            <AvatarFallback className="bg-neon-cyan/20 text-neon-cyan text-3xl">
              <User className="h-10 w-10" />
            </AvatarFallback>
          </Avatar>
          <div>
            <CardTitle className="text-2xl text-electric-violet">{profile.full_name}</CardTitle>
            <p className="text-gray-400">{profile.email}</p>
          </div>
        </CardHeader>
        <CardContent className="space-y-4 text-gray-300">
          <div>
            <p className="text-sm font-medium text-gray-400">Role:</p>
            <p className="text-base">{profile.role}</p>
          </div>
          {profile.phone_number && (
            <div>
              <p className="text-sm font-medium text-gray-400">Phone Number:</p>
              <p className="text-base">{profile.phone_number}</p>
            </div>
          )}
          <div>
            <p className="text-sm font-medium text-gray-400">Member Since:</p>
            <p className="text-base">{new Date(profile.created_at).toLocaleDateString()}</p>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-400">Last Updated:</p>
            <p className="text-base">{new Date(profile.updated_at).toLocaleDateString()}</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ProfilePage;