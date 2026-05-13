# ⚡ TaskFlow — Team Task Manager

A full-stack web application for managing projects, assigning tasks, and tracking progress with role-based access control.

## 🚀 Live Demo
> Replace with your deployed URL after deployment  
> **Frontend:** `https://taskflow-frontend.vercel.app`  
> **API:** `https://taskflow-backend.onrender.com`

---

## ✨ Features

### Authentication
- JWT-based signup & login
- Secure password hashing (bcrypt)
- Protected routes (frontend & backend)
- Rate limiting on auth endpoints

### Projects
- Create projects with name, description & color
- View all projects you're a member of
- Progress tracking per project
- Archive/delete projects (owner only)

### Team Management
- Invite members via email
- Role-based access: **Admin** and **Member**
- Admins can add/remove members and delete tasks
- Members can create/update tasks

### Task Management
- Full CRUD for tasks
- Kanban board view (Todo → In Progress → Review → Done)
- Priority levels: Low / Medium / High / Urgent
- Task assignment to project members
- Due dates
- Task comments
- Quick status updates inline

### Dashboard
- Summary stats (projects, tasks, overdue, completion rate)
- My assigned tasks (sorted by due date)
- Recent activity across projects

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, React Router v6, TanStack Query |
| Styling | Pure CSS with design tokens |
| Backend | Node.js, Express.js |
| Database | PostgreSQL |
| Auth | JWT + bcrypt |
| Validation | express-validator |
| Deployment | Vercel (Frontend), Render (Backend), Neon (Database) |

---

## 📁 Project Structure

```
taskflow/
├── backend/
│   ├── src/
│   │   ├── config/
│   │   │   ├── database.js      # PostgreSQL connection
│   │   │   └── migrate.js       # DB schema migrations
│   │   ├── controllers/
│   │   │   ├── authController.js
│   │   │   ├── projectController.js
│   │   │   └── taskController.js
│   │   ├── middleware/
│   │   │   ├── auth.js          # JWT + role verification
│   │   │   └── errorHandler.js  # Global error handler
│   │   ├── routes/
│   │   │   ├── auth.js
│   │   │   ├── projects.js
│   │   │   ├── tasks.js
│   │   │   └── dashboard.js
│   │   └── server.js
│   ├── .env.example
│   └── package.json
│
└── frontend/
    ├── src/
    │   ├── components/
    │   │   └── layout/          # Sidebar layout
    │   ├── context/
    │   │   └── AuthContext.js   # Auth state management
    │   ├── pages/
    │   │   ├── LoginPage.js
    │   │   ├── SignupPage.js
    │   │   ├── DashboardPage.js
    │   │   ├── ProjectsPage.js
    │   │   └── ProjectDetailPage.js
    │   ├── utils/
    │   │   └── api.js           # Axios instance
    │   └── App.js
    └── package.json
```

---

## ⚙️ Local Setup

### Prerequisites
- Node.js v18+
- PostgreSQL v14+

### 1. Clone the repo
```bash
git clone https://github.com/your-username/taskflow.git
cd taskflow
```

### 2. Set up the Backend
```bash
cd backend
npm install
cp .env.example .env
```

Edit `.env`:
```env
DATABASE_URL=postgresql://your_user:your_password@localhost:5432/taskflow
JWT_SECRET=your_super_secret_key_here
FRONTEND_URL=http://localhost:3000
NODE_ENV=development
PORT=5000
```

Create the database:
```bash
psql -U postgres -c "CREATE DATABASE taskflow;"
```

Run migrations:
```bash
npm run migrate
```

Start backend:
```bash
npm run dev   # development (nodemon)
# or
npm start     # production
```

### 3. Set up the Frontend
```bash
cd ../frontend
npm install
cp .env.example .env
```

Edit `.env`:
```env
REACT_APP_API_URL=http://localhost:5000/api
```

Start frontend:
```bash
npm start
```

### 4. Open the app
Go to `http://localhost:3000` and create your account!

---

## 🌐 Deployment for Free (Vercel, Render & Neon)

We recommend separating the deployment of your frontend, backend, and database to take advantage of the best free tiers available today.

### Step 1 — Push to GitHub
```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/your-username/taskflow.git
git push -u origin main
```

### Step 2 — Set Up the Database (Neon)
1. Go to [neon.tech](https://neon.tech) and create a free account.
2. Create a new project and select the PostgreSQL version (v14+).
3. Copy the **Connection String** (this will be your `DATABASE_URL`). It should look like `postgresql://user:password@endpoint.neon.tech/dbname?sslmode=require`.

### Step 3 — Deploy Backend (Render)
1. Go to [render.com](https://render.com) and create a free account.
2. Click **New +** and select **Web Service**.
3. Connect your GitHub repository.
4. Configure the service:
   - **Name**: `taskflow-api`
   - **Root Directory**: `backend`
   - **Environment**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `npm run migrate && npm start`
   - **Instance Type**: Free
5. Add Environment Variables:
   - `DATABASE_URL` → *Paste your Neon Connection String here*
   - `JWT_SECRET` → *Generate a secure random string (e.g., `node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"`)*
   - `NODE_ENV` → `production`
   - `FRONTEND_URL` → *Leave blank for now, we will update this later*
6. Click **Create Web Service**. Wait for the deployment to finish, and copy the assigned URL (e.g., `https://taskflow-api.onrender.com`).

### Step 4 — Deploy Frontend (Vercel)
1. Go to [vercel.com](https://vercel.com) and create a free account.
2. Click **Add New...** → **Project**.
3. Import your `taskflow` repository.
4. Configure the project:
   - **Framework Preset**: Create React App (or Vite, depending on your build tool).
   - **Root Directory**: `frontend`
5. Add Environment Variables:
   - `REACT_APP_API_URL` → `https://taskflow-api.onrender.com/api` *(Use the Render URL you got from Step 3)*
6. Click **Deploy**. Vercel will build and deploy your frontend. Copy the deployed URL.

### Step 5 — Finalize CORS (Render)
1. Go back to your Backend Web Service on [Render](https://render.com).
2. Go to the **Environment** tab.
3. Update the `FRONTEND_URL` variable to your Vercel URL (e.g., `https://taskflow.vercel.app`).
4. Wait for Render to automatically redeploy the backend with the updated CORS policy.

---

## 🔌 REST API Reference

### Auth
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/signup` | Register new user |
| POST | `/api/auth/login` | Login |
| GET | `/api/auth/me` | Get current user |

### Projects
| Method | Endpoint | Auth | Role |
|--------|----------|------|------|
| GET | `/api/projects` | ✅ | Any |
| POST | `/api/projects` | ✅ | Any |
| GET | `/api/projects/:id` | ✅ | Member |
| PUT | `/api/projects/:id` | ✅ | Admin |
| DELETE | `/api/projects/:id` | ✅ | Owner |
| POST | `/api/projects/:id/members` | ✅ | Admin |
| DELETE | `/api/projects/:id/members/:userId` | ✅ | Admin |

### Tasks
| Method | Endpoint | Auth | Role |
|--------|----------|------|------|
| GET | `/api/projects/:id/tasks` | ✅ | Member |
| POST | `/api/projects/:id/tasks` | ✅ | Member |
| PUT | `/api/projects/:id/tasks/:taskId` | ✅ | Member |
| DELETE | `/api/projects/:id/tasks/:taskId` | ✅ | Admin |
| POST | `/api/projects/:id/tasks/:taskId/comments` | ✅ | Member |

### Dashboard
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/dashboard` | Aggregated stats & tasks |

---

## 🔐 Role-Based Access Control

| Action | Admin | Member |
|--------|-------|--------|
| View project | ✅ | ✅ |
| Create tasks | ✅ | ✅ |
| Update tasks | ✅ | ✅ |
| Delete tasks | ✅ | ❌ |
| Add members | ✅ | ❌ |
| Remove members | ✅ | ❌ |
| Update project | ✅ | ❌ |
| Delete project | Owner only | ❌ |

---

## 📄 License
MIT — free for personal and commercial use.

---
**Created by [Yogendra1823](https://github.com/Yogendra1823) — Medarametla Yogendra**

