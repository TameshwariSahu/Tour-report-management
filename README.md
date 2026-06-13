# Tour Report Management System

A web app for submitting tour program details, department-submitted tour forms, document uploads, and approval/rejection from a user dashboard.

## Flow

- Login screen has two main options: Employee and User.
- Employee login uses registered SAP ID, email, and OTP.
- User login uses alphanumeric User ID and password.
- User role controls access:
  - `admin` opens the approval dashboard.
  - `department` opens the department tour form.
- Employee can fill their own tour form and save incomplete work as draft.
- Department users can fill a blank form on behalf of an employee/person.
- Department field is set from the department user record and remains locked.
- SAP ID is editable in department form and must be 8 digits.
- Draft and rejected reports can be edited.
- Pending and approved reports are locked from editing.
- Grade, department, and destination are loaded from master tables to keep form data consistent.
- Data is stored in MySQL.
- Admin users can filter reports by year, date range, and status.
- Admin users can preview/download uploaded PDF/image files.
- Admin users can export filtered reports to Excel.
- Admin users can approve or reject reports with a reason.
- Approval/rejection email is sent to the employee email found by report SAP ID.
- Email can use Gmail SMTP locally or Resend in production, based on environment variables.

## Tables

| Table | Purpose |
|---|---|
| `users` | Stores common user logins with `user_id`, password, role, department name, and status. Used for admin and department login. |
| `employees` | Stores allowed employee SAP ID, email, name, grade, department, and active/inactive status. |
| `employee_otps` | Stores OTP codes, expiry time, and usage status for employee login. |
| `master_grades` | Stores grade options used in the employee form. |
| `master_departments` | Stores department options used in the employee form. |
| `master_destinations` | Stores destination options used in the employee form. |
| `tour_reports` | Stores employee form details, tour details, approval note, and approval status. |
| `tour_supporting_documents` | Stores multiple supporting documents for a tour report. |

## Login Types

| Login | Credentials | Access |
|---|---|---|
| Employee | SAP ID + email + OTP | Employee tour form with employee details loaded from `employees`. |
| User - Admin | User ID + password, `role = admin` | Approval dashboard. |
| User - Department | User ID + password, `role = department` | Department form with department locked from `users.department_name`. |

User IDs are alphanumeric and should be 4-20 characters.

## Form Rules

- Official tour, medical self, and escort duty show their own relevant fields.
- If `Any leaves availed in between` is `Yes`, leave start date and leave end date are mandatory.
- Leave end date cannot be before leave start date.
- Approved reports cannot be edited.
- Pending reports cannot be edited until admin action is taken.
- Department-created reports send approval/rejection email only if the entered SAP ID exists in `employees` with a valid email.

## Upload Rules

- Allowed file types: PDF, JPG/JPEG, PNG.
- Approval note: 1 file required for submission.
- Supporting documents: up to 3 files.
- PDF max size: 3 MB.
- JPG/PNG max size: 1 MB.
- Uploaded files and merged PDFs are stored on the backend server under `uploads/tour-reports`.
- Docker keeps uploaded files in the `tour_report_uploads` volume so files remain available after container restart.

## Local Setup

Create database using:

```bash
mysql -u root -p < database/schema.sql
```

Backend:

```bash
cd backend
npm install
npm run dev
```

Frontend:

```bash
cd frontend
npm install
npm run dev
```

## Docker Setup

Install Docker Desktop, then check:

```bash
docker --version
docker compose version
```

Create a local Docker environment file from the example:

```bash
copy .env.docker.example .env
```

Update `.env` with your local values. Do not commit `.env`.

Start the full project:

```bash
docker compose up --build
```

Docker Compose starts:

| Service | URL / Port |
|---|---|
| Frontend | `http://localhost:5174` |
| Backend | `http://localhost:5001` |
| MySQL | `localhost:3307` |

The backend connects to MySQL using `DB_HOST=mysql` inside Docker. This is correct because containers communicate by service name, not by `localhost`.
Uploaded files are stored in a Docker volume named `tour_report_uploads`.

Stop containers:

```bash
docker compose down
```

Remove containers, database volume, and uploaded file volume:

```bash
docker compose down -v
```

Use `-v` carefully because it deletes Docker MySQL data and uploaded files.

Add an employee before testing employee OTP login:

```sql
INSERT INTO employees
(sap_id, name, email, designation, grade, department)
VALUES
('87654321', 'Tannu Sahu', 'tannu@example.com', 'Engineer', 'RS8', 'C & IT');
```

Add admin and department users:

```sql
INSERT INTO users
(user_id, password, role, department_name, status)
VALUES
('ADMIN001', 'Admin@123', 'admin', NULL, 'active'),
('DEPTCIT01', 'Dept@123', 'department', 'C & IT', 'active');
```

Plain passwords work for testing, but hashed passwords are recommended for real use.

## Email Setup

For local Gmail SMTP testing, add these keys in backend `.env`:

```env
EMAIL_PROVIDER=smtp
SMTP_HOST=smtp.gmail.com
SMTP_PORT=465
SMTP_SECURE=true
SMTP_USER=yourgmail@gmail.com
SMTP_PASS=your_16_digit_google_app_password
SMTP_FROM=Tour Report Management <yourgmail@gmail.com>
```

Gmail SMTP needs 2-Step Verification enabled and an App Password. Use the App Password in `SMTP_PASS`, not the normal Gmail password.

For port `587`, use:

```env
SMTP_PORT=587
SMTP_SECURE=false
```

If `EMAIL_PROVIDER=smtp` is set, the backend sends email through SMTP even when Resend keys are also present.

For Resend, add these keys in backend `.env` locally and Render environment variables in production:

```env
EMAIL_PROVIDER=resend
RESEND_API_KEY=your_resend_api_key
RESEND_FROM=Tour Report Management <onboarding@resend.dev>
```

Email is used for:

- Employee OTP login.
- Approval notification.
- Rejection notification with reason.

## Deployment Notes

- Backend can be deployed on Render.
- Frontend can be deployed on Vercel.
- After backend changes, redeploy Render.
- After frontend changes, redeploy Vercel.
- Do not push `.env` to GitHub.
