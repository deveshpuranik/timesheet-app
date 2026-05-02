# Mruda Eco Village Hotel Management

A production-ready role-based hotel timesheet application for Mruda Eco Village, built with Next.js App Router, MongoDB, mongoose, Tailwind CSS, JWT authentication, HTTP-only cookies, admin approval for employee registration, and Excel export using `xlsx`.

## Folder Structure

```txt
.
├── app
│   ├── api
│   │   ├── admin
│   │   │   └── users
│   │   │       ├── [id]
│   │   │       │   └── route.js
│   │   │       └── route.js
│   │   ├── auth
│   │   │   ├── login
│   │   │   │   └── route.js
│   │   │   ├── logout
│   │   │   │   └── route.js
│   │   │   ├── me
│   │   │   │   └── route.js
│   │   │   └── register
│   │   │       └── route.js
│   │   ├── export
│   │   │   └── route.js
│   │   ├── timesheet
│   │   │   └── route.js
│   │   └── users
│   │       └── route.js
│   ├── dashboard
│   │   └── page.js
│   ├── export
│   │   └── page.js
│   ├── login
│   │   └── page.js
│   ├── register
│   │   └── page.js
│   ├── timesheet
│   │   └── page.js
│   ├── globals.css
│   ├── layout.js
│   └── page.js
├── components
│   ├── AuthForm.js
│   ├── EntriesTable.js
│   ├── Navbar.js
│   └── TimesheetForm.js
├── lib
│   ├── auth.js
│   ├── dbConnect.js
│   └── timesheet.js
├── models
│   ├── User.js
│   └── Timesheet.js
├── proxy.js
├── public
│   └── logo.png
├── .env.example
├── .gitignore
├── jsconfig.json
├── next.config.mjs
├── package.json
├── postcss.config.js
├── tailwind.config.js
└── README.md
```

## Setup

Do not run `npm audit fix --force` on this project. It can downgrade Next.js to an old version that does not support the App Router.

1. Install dependencies:

```bash
npm install
```

2. Create a local environment file:

```bash
cp .env.example .env.local
```

3. Add your MongoDB connection string to `.env.local`:

```env
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/timesheet_app?retryWrites=true&w=majority
JWT_SECRET=replace-with-a-long-random-secret
```

4. Run locally:

```bash
npm run dev
```

5. Open:

```txt
http://localhost:3000
```

## Pages

- `/` - Home page
- `/timesheet` - Protected timesheet form with logged-in employee auto-filled
- `/dashboard` - Protected employee/admin dashboard
- `/export` - Protected Excel export download page
- `/login` - JWT login
- `/register` - Account registration

## API Routes

- `POST /api/auth/register` - Create pending employee user with hashed password
- `POST /api/auth/login` - Login only approved users and set HTTP-only JWT cookie
- `GET /api/auth/me` - Return current logged-in user
- `POST /api/auth/logout` - Clear auth cookie
- `GET /api/admin/users` - Admin-only list of all users and statuses
- `PATCH /api/admin/users/:id` - Admin-only approve/reject user
- `POST /api/timesheet` - Save a timesheet entry for the logged-in user
- `GET /api/timesheet` - Employee gets own entries; admin gets all or filtered entries
- `GET /api/export` - Download authorized entries as `timesheet.xlsx`
- `GET /api/users` - Admin-only employee list for filtering
- `POST /api/users` - Admin-only user creation

## Registration Approval

- New public registrations are always created as `employee` with `status: pending`.
- Pending and rejected users cannot login.
- Admins approve or reject users from the dashboard approval panel.
- Existing legacy admin users without a status are automatically marked approved on first login.

## Deploy on Vercel

1. Push this project to GitHub.
2. Import the repository in Vercel.
3. Add this environment variable in Vercel Project Settings:

```env
MONGODB_URI=your_mongodb_connection_string
JWT_SECRET=your_long_random_production_secret
```

4. Deploy.

Vercel will run `npm install` and `npm run build` automatically.
