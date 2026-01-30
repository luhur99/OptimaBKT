"use client";

import React from 'react';
import DashboardLayout from '@/layouts/DashboardLayout'; // Assuming DashboardLayout is the main layout

const SettingsPage = () => {
  return (
    <div className="container mx-auto py-10">
      <h1 className="text-3xl font-bold mb-6 text-neon-cyan">Settings</h1>
      <p className="text-gray-300">This is the settings page. You can manage your application settings here.</p>
      {/* Add your settings components here */}
    </div>
  );
};

export default SettingsPage;