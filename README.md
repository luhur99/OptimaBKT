# OptimaBKT - Welcome to your Elmony app

## Supabase Integration

This application is connected to Supabase for backend services including:
- **Database**: PostgreSQL database for all application data
- **Authentication**: User authentication and session management
- **Real-time**: Real-time data synchronization (if enabled)

### Quick Start

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Configure environment variables:**
   - Copy `.env.example` to `.env` (if needed)
   - Or use the existing `.env` file with your Supabase credentials

3. **Start the development server:**
   ```bash
   npm run dev
   ```

4. **Test your Supabase connection:**
   - Navigate to [http://localhost:5173/supabase-test](http://localhost:5173/supabase-test)
   - Run the connection tests to verify everything is working

### Connecting to Your Supabase Account

✅ **Already Connected!** This application is configured to connect to your Supabase account.

For detailed instructions on:
- Verifying your connection
- Connecting to a different Supabase account
- Running database migrations
- Troubleshooting common issues

See **[SUPABASE_SETUP.md](./SUPABASE_SETUP.md)** for the complete guide.

### Features

- **User Management**: Admin panel for managing users and roles
- **Dashboard**: Overview of key metrics and operations
- **Operational Modules**: Scheduling, billing, inventory, procurement
- **Sales Module**: Sales scheduling and order management
- **Real-time Updates**: Live data synchronization with Supabase

### Tech Stack

- **Frontend**: React + TypeScript + Vite
- **UI**: Tailwind CSS + shadcn/ui components
- **Backend**: Supabase (PostgreSQL + Auth + Storage)
- **State Management**: React Query (@tanstack/react-query)
- **Routing**: React Router v6

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run build:dev` - Build in development mode
- `npm run lint` - Run ESLint
- `npm run preview` - Preview production build locally

