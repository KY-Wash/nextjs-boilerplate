# Supabase Integration Setup Guide

## Step 1: Create a Supabase Project

1. Go to [supabase.com](https://supabase.com)
2. Sign up or log in to your account
3. Click "New Project"
4. Fill in the project details:
   - **Project Name**: Give it a name (e.g., "KY Wash")
   - **Database Password**: Create a strong password (you'll need this)
   - **Region**: Select the region closest to you
5. Click "Create new project" and wait for setup to complete

## Step 2: Get Your Credentials

1. Once your project is created, go to **Settings** → **API**
2. Copy:
   - **Project URL** (this is your `NEXT_PUBLIC_SUPABASE_URL`)
   - **anon public** key (this is your `NEXT_PUBLIC_SUPABASE_ANON_KEY`)

## Step 3: Create the Database Table

1. In your Supabase project, go to the **SQL Editor**
2. Click **New Query**
3. Paste the following SQL code to create the `usage_history` table:

```sql
-- Create usage_history table
CREATE TABLE usage_history (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    student_id varchar(255) NOT NULL,
      phone_number varchar(20) NOT NULL,
        machine_type varchar(50) NOT NULL,
          machine_id integer NOT NULL,
            mode varchar(100) NOT NULL,
              duration integer NOT NULL,
                spending decimal(10, 2) NOT NULL,
                  status varchar(50) NOT NULL,
                    date varchar(50) NOT NULL,
                      timestamp bigint NOT NULL,
                        created_at timestamp DEFAULT NOW(),
                          updated_at timestamp DEFAULT NOW()
                          );

                          -- Create index for faster queries
                          CREATE INDEX idx_student_id ON usage_history(student_id);
                          CREATE INDEX idx_machine_type ON usage_history(machine_type);
                          CREATE INDEX idx_timestamp ON usage_history(timestamp);
                          CREATE INDEX idx_status ON usage_history(status);
```

4. Click **Run**

## Step 4: Set Up Environment Variables

1. In your Next.js project root, create or update `.env.local`:

```
NEXT_PUBLIC_SUPABASE_URL=your_project_url_here
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
```

Replace:
- `your_project_url_here` with your Project URL from Step 2
- `your_anon_key_here` with your anon public key from Step 2

2. Save the file and restart your development server:
```bash
npm run dev
```

## Step 5: Enable Row Level Security (Optional but Recommended)

For production, enable Row Level Security:

1. In Supabase, go to **Authentication** → **Policies**
2. Enable RLS on the `usage_history` table
3. Create policies to control data access

## Step 6: Test the Integration

The application now automatically syncs usage data to Supabase when:
- A machine is started
- A machine completes or is cancelled
- Clothes are collected

You can view your data in Supabase:
- Go to **Table Editor**
- Click on `usage_history`
- See all your laundry usage records

## Troubleshooting

### "Supabase credentials not configured" message
- Check that `.env.local` exists in your project root
- Verify the environment variables are spelled correctly
- Restart your development server after adding env variables

### Connection errors
- Verify your Project URL and API key are correct
- Check that your Supabase project is active
- Make sure the `usage_history` table exists

### Data not syncing
- Check browser console for any error messages
- Verify the table structure matches the SQL schema
- Check Supabase logs in the **Logs** section

## For Vercel Deployment

1. Go to your Vercel project settings
2. Add environment variables:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
3. Deploy your project

The application will automatically use these credentials in production.
