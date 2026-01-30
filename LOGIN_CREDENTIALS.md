# Quick Start - Login Credentials

## 🔐 To Login to the Application

You have Supabase configured! Now you need to create a user account.

### Step 1: Run the Database Schema

1. Open your Supabase project: https://fujpwkijoerifonrtwid.supabase.co
2. Go to **SQL Editor**
3. Copy and paste the contents of `supabase-schema.sql`
4. Click **Run** to create all tables

### Step 2: Create Your First User

1. In Supabase, go to **Authentication** → **Users**
2. Click "Add user" → "Create new user"
3. Fill in:
   - **Email**: admin@test.com (or your email)
   - **Password**: Test123! (or your password)
   - **Auto Confirm User**: ✅ CHECK THIS BOX
4. Click "Create user"
5. **Copy the User ID** (it's a UUID like `123e4567-e89b-12d3-a456-426614174000`)

### Step 3: Add User Profile

1. Go back to **SQL Editor**
2. First, get your company ID:
```sql
SELECT id, name FROM companies;
```

3. Copy the Macwest company ID, then run:
```sql
-- Replace the UUIDs with your actual values
INSERT INTO users (id, email, name, role, company_id, password) VALUES
  ('YOUR-USER-ID-FROM-STEP-2', 'admin@test.com', 'Admin User', 'admin', 'YOUR-MACWEST-COMPANY-ID', 'Test123!');
```

### Step 4: Login!

Now you can login with:
- **Email**: admin@test.com
- **Password**: Test123!

---

## 🎯 What You'll See After Login

✅ **Dashboard** - Stats, idle tasks, recent projects
✅ **Task Board** - Drag-and-drop Kanban board
✅ **Projects** - Profitability tracking
✅ **Analytics** - Charts and insights
✅ **Pipeline** - Sales opportunities
✅ **Reports** - Export data
✅ **Settings** - Configuration

---

## 📝 Add Sample Data (Optional)

After logging in, you can add sample data:

```sql
-- Get your user ID
SELECT id, email FROM users;

-- Get company IDs
SELECT id, name FROM companies;

-- Create sample projects (replace UUIDs)
INSERT INTO projects (name, description, company_id, contract_value, actual_cost, expected_handover, created_by) VALUES
  ('Site Alpha', 'Commercial construction project', 'macwest-company-id', 500000, 120000, '2026-03-15', 'your-user-id'),
  ('Bridge B', 'Infrastructure development', 'cypress-company-id', 800000, 704000, '2026-04-20', 'your-user-id'),
  ('Housing Block 1', 'Residential development', 'northbrook-company-id', 1200000, 1164000, '2026-05-10', 'your-user-id');

-- Get project IDs
SELECT id, name FROM projects;

-- Create sample tasks (replace UUIDs)
INSERT INTO tasks (title, description, project_id, assignee_id, stage, priority, due_date, created_by) VALUES
  ('Foundation laying', 'Complete foundation work', 'project-id-1', 'your-user-id', 'in_progress', 'high', '2026-02-05', 'your-user-id'),
  ('Environmental Audit', 'Conduct environmental assessment', 'project-id-2', 'your-user-id', 'blockers', 'critical', '2026-01-30', 'your-user-id'),
  ('Permit Application', 'Submit building permits', 'project-id-3', 'your-user-id', 'yet_to_start', 'medium', '2026-02-10', 'your-user-id');
```

---

## 🐛 Troubleshooting

**"Invalid email or password"**
- Make sure you created the user in Supabase Auth
- Make sure you checked "Auto Confirm User"
- Make sure you added the user profile to the `users` table

**"Row Level Security policy violation"**
- Make sure the user's `company_id` matches a company in the `companies` table
- Make sure the user ID in the `users` table matches the Auth user ID

**Still stuck?**
- Check browser console for errors
- Verify .env.local has correct credentials
- See SUPABASE_SETUP.md for detailed instructions
