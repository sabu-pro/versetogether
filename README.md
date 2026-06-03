# VerseTogether

VerseTogether is a private Bible verse sharing Progressive Web App for a couple.

It includes:

- Two-user private login using Supabase Auth
- Monday to Friday alternating verse responsibility
- Manual verse submission
- Reflection system
- In-app notifications when a verse or reflection is submitted
- Prayer request section
- Weekly spiritual goal
- Verse history and search
- PWA setup for iPhone Home Screen
- Vercel deployment support

## 1. Open in VS Code

Extract the ZIP folder.

Open the extracted folder in VS Code.

## 2. Install dependencies

Open VS Code terminal and run:

```bash
npm install
```

## 3. Create Supabase project

1. Go to Supabase.
2. Create a new project.
3. Open SQL Editor.
4. Copy everything from:

```text
supabase/schema.sql
```

5. Paste it in Supabase SQL Editor.
6. Click Run.

## 4. Create two login users

In Supabase:

1. Go to Authentication.
2. Go to Users.
3. Click Add User.
4. Create your account.
5. Create your partner's account.
6. Copy both User IDs.

## 5. Add both profiles

Go to Supabase Table Editor.

Open `profiles`.

Insert two rows.

Example for you:

```text
id: paste your auth user id
email: your email
name: Sabut
partner_order: 1
```

Example for partner:

```text
id: paste partner auth user id
email: partner email
name: Her name
partner_order: 2
```

Important:

- partner_order 1 starts Monday, Wednesday, Friday in week one.
- partner_order 2 starts Tuesday, Thursday in week one.
- Next week it switches automatically.

## 6. Add environment variables locally

Create a file named:

```text
.env.local
```

Copy from `.env.example`:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

You can find these in Supabase:

Project Settings → API

## 7. Run locally

```bash
npm run dev
```

Open:

```text
http://localhost:3000
```

## 8. Push to GitHub

Create a new GitHub repository.

Then in VS Code terminal:

```bash
git init
git add .
git commit -m "Initial VerseTogether project"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/versetogether.git
git push -u origin main
```

Replace `YOUR_USERNAME`.

## 9. Deploy to Vercel

1. Go to Vercel.
2. Sign in with GitHub.
3. Click Add New Project.
4. Import your VerseTogether GitHub repo.
5. Add Environment Variables:

```text
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
```

6. Click Deploy.

## 10. Add to iPhone Home Screen

On iPhone:

1. Open Safari.
2. Go to your Vercel app URL.
3. Tap Share.
4. Tap Add to Home Screen.
5. Name it VerseTogether.
6. Tap Add.

Now it appears like an app.

## Important note about push notifications

This project includes in-app notifications, meaning:

- When you share a verse, your partner sees a notification inside the app.
- When your partner writes a reflection, you see a notification inside the app.

True background push notifications on iPhone require extra setup with web push services and iOS support. This project gives you a strong working version first.
