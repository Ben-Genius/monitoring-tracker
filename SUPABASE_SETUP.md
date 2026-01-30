# Supabase Setup Guide for Monitoring Tracker

## Step 1: Create Supabase Project

1. Go to [https://supabase.com](https://supabase.com)
2. Click "Start your project"
3. Sign in with GitHub
4. Click "New Project"
5. Fill in:
   - **Name**: monitoring-tracker
   - **Database Password**: (generate a strong password and save it)
   - **Region**: Choose closest to you
   - **Pricing Plan**: Free tier is fine for development
6. Click "Create new project"
7. Wait 2-3 minutes for project to initialize

## Step 2: Get Your API Credentials

1. In your Supabase project dashboard, go to **Settings** → **API**
2. Copy these values:
   - **Project URL** (looks like: `https://xxxxx.supabase.co`)
   - **anon public** key (under "Project API keys")

3. Update your `.env.local` file:
```bash
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

## Step 3: Run Database Schema

1. In Supabase dashboard, go to **SQL Editor**
2. Click "New query"
3. Copy the entire contents of `supabase-schema.sql`
4. Paste into the SQL editor
5. Click "Run" (or press Cmd/Ctrl + Enter)
6. You should see "Success. No rows returned"

## Step 4: Enable Email Authentication

1. Go to **Authentication** → **Providers**
2. Make sure **Email** is enabled (it should be by default)
3. Scroll down to **Email Templates** (optional)
4. Customize confirmation email if desired

## Step 5: Create Test Users

### Option A: Via Dashboard (Recommended for testing)
1. Go to **Authentication** → **Users**
2. Click "Add user" → "Create new user"
3. Fill in:
   - **Email**: admin@test.com
   - **Password**: Test123!
   - **Auto Confirm User**: ✅ (check this)
4. Click "Create user"
5. Copy the User ID (UUID)

### Option B: Via SQL (After creating auth user)
After creating a user in the Auth dashboard, add their profile:

```sql
-- Get the company IDs first
SELECT id, name FROM companies;

-- Insert user profile (replace UUIDs with actual values)
INSERT INTO users (id, email, name, role, company_id) VALUES
  ('paste-auth-user-id-here', 'admin@test.com', 'Admin User', 'admin', 'paste-macwest-company-id-here');
```

## Step 6: Create Sample Data (Optional)

```sql
-- Get user and company IDs
SELECT id, email FROM users;
SELECT id, name FROM companies;

-- Create sample projects
INSERT INTO projects (name, description, company_id, contract_value, actual_cost, expected_handover, created_by) VALUES
  ('Site Alpha', 'Commercial construction project', 'macwest-company-id', 500000, 120000, '2026-03-15', 'your-user-id'),
  ('Bridge B', 'Infrastructure development', 'cypress-company-id', 800000, 704000, '2026-04-20', 'your-user-id'),
  ('Housing Block 1', 'Residential development', 'northbrook-company-id', 1200000, 1164000, '2026-05-10', 'your-user-id');

-- Create sample tasks
INSERT INTO tasks (title, description, project_id, assignee_id, stage, priority, due_date, created_by) VALUES
  ('Foundation laying completed', 'Complete foundation work for Site Alpha', 'site-alpha-project-id', 'your-user-id', 'in_progress', 'high', '2026-02-05', 'your-user-id'),
  ('Environmental Audit', 'Conduct environmental impact assessment', 'bridge-b-project-id', 'your-user-id', 'blockers', 'critical', '2026-01-30', 'your-user-id'),
  ('Permit Application', 'Submit building permits to local authority', 'housing-project-id', 'your-user-id', 'yet_to_start', 'medium', '2026-02-10', 'your-user-id');
```

## Step 7: Test the Application

1. Restart your dev server:
```bash
npm run dev
```

2. Navigate to http://localhost:5173

3. You should see the login page

4. Login with your test credentials:
   - Email: admin@test.com
   - Password: Test123!

5. After login, you should see:
   - Dashboard with stats
   - Task board with your sample tasks
   - Projects page with sample projects

## Step 8: Verify Everything Works

### Check Authentication
- ✅ Can login successfully
- ✅ Redirected to dashboard after login
- ✅ Can see user profile in sidebar

### Check Data Loading
- ✅ Dashboard shows stats
- ✅ Task board displays tasks in correct stages
- ✅ Projects page shows project cards
- ✅ Can drag tasks between stages

### Check RLS Policies
- ✅ Can only see data from your company (unless admin)
- ✅ Can create tasks
- ✅ Can update tasks

## Troubleshooting

### "Missing Supabase environment variables"
- Make sure `.env.local` exists and has correct values
- Restart dev server after updating `.env.local`

### "Invalid API key"
- Double-check you copied the **anon public** key, not the service_role key
- Make sure there are no extra spaces in the key

### "Row Level Security policy violation"
- Make sure you created a user profile in the `users` table
- Verify the user's `company_id` matches a company in the `companies` table

### Tasks not showing up
- Check browser console for errors
- Verify tasks exist in database: `SELECT * FROM tasks;`
- Make sure tasks have valid `project_id` and `assignee_id`

### Can't drag tasks
- Make sure @dnd-kit packages are installed
- Check browser console for errors
- Verify task has valid `id` field

## Next Steps

1. **Create more users** for testing multi-user scenarios
2. **Add more projects** to test filtering
3. **Customize RLS policies** if needed for your use case
4. **Set up email templates** for better user experience
5. **Enable additional auth providers** (Google, GitHub, etc.)

## Production Deployment

When ready for production:

1. Update environment variables in your hosting platform
2. Consider upgrading Supabase plan for better performance
3. Set up database backups
4. Configure custom domain for Supabase project
5. Review and tighten RLS policies
6. Set up monitoring and alerts

---

**Need Help?**
- Supabase Docs: https://supabase.com/docs
- Supabase Discord: https://discord.supabase.com
- Project Issues: Create an issue in your repo
