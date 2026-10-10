# Mruda Eco Village – Timesheets and Leave

Internal staff site for Mruda Eco Village: daily timesheets, leave requests with approval,
team hours for admins and supervisors, and Excel export.

Built with Next.js (App Router), MongoDB (mongoose), Tailwind CSS and JWT login in an
HTTP-only cookie. Hosted on Vercel.

## What each role can do

| | Employee | Supervisor | Admin |
|---|---|---|---|
| Fill in own timesheet, request leave | yes | yes | yes |
| See hours and entries | own | own + employees | everyone |
| Leave remarks on entries | – | employees | everyone |
| Approve / reject leave | – | employees | everyone |
| Export to Excel | own | own + employees | everyone |
| Approve signups, set department / role, reset passwords | – | – | yes |

- New signups choose a department and **cannot log in until an admin approves them** (People page).
- A person's department is fixed; only an admin can change it. The timesheet form shows
  only that department's work types.
- Admins and supervisors get a bell notification for new signups and leave requests;
  staff get one when their account or leave is approved/rejected or a remark is left.

## Where to change common things

| To change… | Edit |
|---|---|
| Departments, work types, leave types | `lib/timesheet.js` |
| Who can see whose timesheets | `lib/scope.js` |
| Login / approval rules | `lib/auth.js`, `app/api/auth/*` |
| Excel layout | `app/api/export/route.js` |
| Colours and fonts | `app/globals.css` |

If a department is ever renamed again, add the old name to `legacyDepartmentNames` in
`lib/timesheet.js`; existing records are then updated automatically (`lib/dataUpgrades.js`).

## Rules the site enforces

- Timesheet dates cannot be in the future (India time).
- The To time must be later than the From time, and one person's entries on a day cannot overlap.
- People can delete their own entries for 7 days; after that only an admin can.
- Leave requests cannot overlap an existing pending or approved request.

## Run on your computer

```bash
npm install
npm run dev
```

Create `.env.local` (see `.env.example`):

```
MONGODB_URI=your MongoDB connection string
JWT_SECRET=a long random secret
```

Open http://localhost:3000.

## Publish

The site is deployed by Vercel from the `main` branch of the GitHub repository. Pushing a
different branch creates a preview address in Vercel that you can test first.
`MONGODB_URI` and `JWT_SECRET` must be set in the Vercel project's Environment Variables.

## First admin

Public signup always creates an employee waiting for approval. The first admin is made by
setting `role: "admin"` on that user in MongoDB; after that, admins manage roles from the
People page.
