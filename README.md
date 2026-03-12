# Orbit — Cloud IDE Platform

Orbit is a full-stack browser-based cloud IDE with an integrated classroom/assignment system. It supports real-time code editing, terminal access, live preview, Git workflows, AI-powered error debugging (Google Gemini), and a teacher-student classroom model with auto-graded DSA assignments.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19, TypeScript, Vite 7, Tailwind CSS 4, Framer Motion |
| Backend | Express 5, TypeScript, Node.js |
| Database | MongoDB (via Prisma ORM) |
| Editor | Monaco Editor (`@monaco-editor/react`) |
| Terminal | xterm.js + node-pty (real PTY sessions) |
| Real-time | WebSocket (terminal I/O), Server-Sent Events (provisioning logs) |
| Auth | Passport.js — Google OAuth 2.0, GitHub OAuth 2.0 |
| AI | Google Gemini — AI error debugging, context-aware code fixes, AI-generated assignment content |
| AST Analysis | @babel/parser — import graph, symbol table, file analysis |
| Git | simple-git (Git CLI wrapper) |
| Security | Helmet, AES-256-GCM encryption, JWT (httpOnly cookies) |

---

## Project Structure

```
Orbit/
├── client/                          # React SPA (Vite)
│   ├── src/
│   │   ├── App.tsx                  # Router setup (6 routes)
│   │   ├── pages/
│   │   │   ├── Landing.tsx          # Marketing page
│   │   │   ├── Login.tsx            # OAuth login (Google/GitHub)
│   │   │   ├── Signup.tsx           # OAuth signup with role selection
│   │   │   ├── Dashboard.tsx        # Role-aware redirect
│   │   │   ├── TeacherDashboard.tsx # Teacher panel (classrooms, assignments, grading)
│   │   │   ├── StudentDashboard.tsx # Student panel (classrooms, submissions, workspaces)
│   │   │   └── WorkspaceIDE.tsx     # Full IDE page (editor, terminal, preview, git, AI)
│   │   ├── components/
│   │   │   ├── ide/                 # IDE components
│   │   │   │   ├── EditorTabs.tsx           # Monaco editor with multi-tab support
│   │   │   │   ├── FileExplorer.tsx         # Recursive file tree
│   │   │   │   ├── TerminalPanel.tsx        # xterm.js multi-terminal
│   │   │   │   ├── PreviewPanel.tsx         # iframe dev-server preview
│   │   │   │   ├── GitPanel.tsx             # Stage, commit, push, pull, branch
│   │   │   │   ├── DiffViewer.tsx           # Side-by-side diff
│   │   │   │   ├── IDEToolbar.tsx           # Run/stop/format toolbar
│   │   │   │   ├── CommandPalette.tsx       # Ctrl+Shift+P command palette
│   │   │   │   ├── QuickOpen.tsx            # Ctrl+P fuzzy file search
│   │   │   │   ├── PortsPanel.tsx           # Detected dev-server ports
│   │   │   │   ├── AIContextPanel.tsx       # AI context preview (what the LLM sees)
│   │   │   │   └── AIErrorResolverPanel.tsx # AI error debugging panel (Gemini)
│   │   │   ├── dashboard/           # Dashboard panels
│   │   │   │   ├── Sidebar.tsx
│   │   │   │   ├── Topbar.tsx
│   │   │   │   ├── WelcomeSection.tsx
│   │   │   │   ├── WorkspacesPanel.tsx
│   │   │   │   ├── WorkspacesCard.tsx
│   │   │   │   ├── CreateWorkspaceModal.tsx
│   │   │   │   ├── TeacherClassroomsPanel.tsx
│   │   │   │   ├── StudentClassroomsPanel.tsx
│   │   │   │   ├── ClassroomDetailView.tsx
│   │   │   │   ├── ClassroomAssignmentsPanel.tsx
│   │   │   │   ├── TeacherAssignmentsPanel.tsx
│   │   │   │   ├── StudentAssignmentsPanel.tsx
│   │   │   │   ├── AssignmentsPanel.tsx
│   │   │   │   ├── AssignmentsCard.tsx
│   │   │   │   ├── CreateAssignmentModal.tsx
│   │   │   │   ├── SubmissionsPanel.tsx
│   │   │   │   ├── StudentSubmissionsPanel.tsx
│   │   │   │   ├── ConnectedAccounts.tsx
│   │   │   │   ├── GitHubConnectCard.tsx
│   │   │   │   ├── GitHubOverview.tsx
│   │   │   │   └── GitHubRepos.tsx
│   │   │   ├── auth/
│   │   │   │   └── ProtectedRoute.tsx   # Auth guard with role checking
│   │   │   ├── assignment/          # (Reserved for assignment-specific components)
│   │   │   ├── landing/             # Landing page sections
│   │   │   │   ├── Hero.tsx             # Navbar + hero section with sparkles
│   │   │   │   ├── Features.tsx         # BentoGrid feature showcase
│   │   │   │   ├── IDEShowcase.tsx      # IDE capabilities preview
│   │   │   │   ├── HowItWorks.tsx       # Step-by-step onboarding guide
│   │   │   │   ├── Stats.tsx            # Platform metrics (boot time, languages, uptime)
│   │   │   │   ├── Testimonials.tsx     # User testimonials carousel
│   │   │   │   ├── CTA.tsx              # Call-to-action with sparkles
│   │   │   │   └── Footer.tsx           # Footer with links
│   │   │   └── ui/                  # Animated UI primitives
│   │   │       ├── background-beams.tsx
│   │   │       ├── backgrounds.tsx
│   │   │       ├── bento-grid.tsx
│   │   │       ├── card-spotlight.tsx
│   │   │       ├── hover-border-gradient.tsx
│   │   │       ├── infinite-moving-cards.tsx
│   │   │       ├── lamp.tsx
│   │   │       ├── sparkles.tsx
│   │   │       ├── text-reveal.tsx
│   │   │       ├── tracing-beam.tsx
│   │   │       └── wavy-background.tsx
│   │   ├── contexts/
│   │   │   ├── AuthContext.tsx       # Global auth state (user, login, logout, role)
│   │   │   └── ThemeContext.tsx      # Dark/light theme (persisted)
│   │   └── lib/
│   │       ├── api.ts               # Axios client with all API namespaces
│   │       └── utils.ts             # cn() — Tailwind class merging
│   ├── starters-main/              # Template starter files (copied during provisioning)
│   └── package.json
│
├── server/                          # Express API server
│   ├── src/
│   │   ├── index.ts                 # Server entry (routes, WebSocket, proxy)
│   │   ├── config/
│   │   │   ├── env.ts               # Environment variables
│   │   │   └── passport.ts          # Google + GitHub OAuth strategies
│   │   ├── routes/
│   │   │   ├── auth.ts              # OAuth login/callback/link/me/logout
│   │   │   ├── github.ts            # GitHub repos, profile, stats
│   │   │   ├── user.ts              # Workspaces CRUD, role switching
│   │   │   ├── workspace.ts         # File system ops, provisioning (SSE)
│   │   │   ├── workspace-git.ts     # Git init/status/stage/commit/push/pull/branch/diff
│   │   │   ├── workspace-run.ts     # Run/stop/exec processes
│   │   │   ├── workspace-terminal.ts# PTY terminals + WebSocket handler
│   │   │   ├── preview.ts           # HTTP proxy to dev-server ports
│   │   │   ├── classroom.ts         # CRUD classrooms, join by code
│   │   │   ├── assignment.ts        # CRUD assignments, start/submit/grade
│   │   │   ├── assignment-ai.ts     # AI-generate assignment content (Gemini)
│   │   │   ├── ai-error.ts          # AI error debugging endpoint (Gemini)
│   │   │   └── context.ts           # Workspace context/indexing API
│   │   ├── lib/
│   │   │   ├── terminal-manager.ts  # PTY lifecycle, scrollback buffer (64KB)
│   │   │   ├── session-manager.ts   # Workspace session state (terminals, ports, UI)
│   │   │   ├── preview-manager.ts   # Port detection from terminal output
│   │   │   ├── workspace-watcher.ts # chokidar fs watcher → WebSocket events
│   │   │   ├── workspace.ts         # File tree, init files, delete workspace
│   │   │   ├── provisioner.ts       # Template provisioning (npm install, git clone)
│   │   │   ├── templates.ts         # Workspace templates (16 templates)
│   │   │   ├── code-runner.ts       # DSA test runner (C++, Python, Java)
│   │   │   ├── encryption.ts        # AES-256-GCM encrypt/decrypt
│   │   │   ├── jwt.ts               # JWT sign/verify
│   │   │   ├── prisma.ts            # Prisma client singleton
│   │   │   └── context/             # AI context engine
│   │   │       ├── index.ts             # Barrel exports
│   │   │       ├── ast-parser.ts        # @babel/parser — imports, exports, symbols
│   │   │       ├── workspace-indexer.ts # File indexing, import graph, symbol table
│   │   │       ├── context-builder.ts   # Build AI-consumable context from workspace
│   │   │       └── prompt-builder.ts    # Structure context into LLM prompts
│   │   └── middleware/
│   │       ├── auth.ts              # authenticate + requireRole middleware
│   │       └── preview-fallback.ts  # Root-relative proxy for preview iframes
│   ├── prisma/
│   │   └── schema.prisma            # MongoDB schema (8 models)
│   └── workspaces/                  # User workspace files on disk
│       └── <workspaceId>/project/
└── README.md
```

---

## Database Schema (MongoDB via Prisma)

### Models

**User**
- `id`, `email` (unique), `name`, `avatar`, `role` (STUDENT | TEACHER | ADMIN)
- OAuth: `provider` (google | github), `providerId`
- Relations: workspaces[], connectedAccounts[], classroomMemberships[], submissions[]

**ConnectedAccount**
- Links additional OAuth providers to a user
- Stores `encryptedAccessToken`, `encryptedRefreshToken` (AES-256-GCM)
- `provider`, `providerAccountId`, `username`, `avatar`

**Workspace**
- `id`, `name`, `template`, `language`, `description`, `visibility` (public/private)
- `status` (provisioning | active | failed | archived)
- `gitUrl` — linked GitHub repo URL
- Belongs to a User

**Classroom**
- `id`, `name`, `description`, `joinCode` (unique 6-char base64url)
- Belongs to a teacher (User)
- Has members (ClassroomMember[]), assignments (Assignment[])

**ClassroomMember**
- Join table: userId + classroomId
- `role` (STUDENT | TEACHER)

**Assignment**
- `type` (WEB_DEV | DSA), `title`, `description`, `difficulty` (EASY | MEDIUM | HARD)
- `template`, `language`, `starterCode` (JSON: filename→content map)
- `maxMarks`, `timeLimit`, `deadline`, `aiAllowed`
- Has testCases (TestCase[]), submissions (Submission[])

**TestCase**
- `input`, `expectedOutput`, `isHidden`, `weight`
- Belongs to an Assignment

**Submission**
- `status` (IN_PROGRESS | SUBMITTED | GRADED | TIMED_OUT)
- `score`, `feedback`, `submittedAt`
- Links to User, Assignment, Workspace

---

## Features — Detailed Breakdown

### 1. Authentication & Authorization

**How it works:**
- OAuth 2.0 via Passport.js (Google and GitHub strategies)
- On successful OAuth callback, a JWT is signed (`userId`, `email`, `role`) and set as an `httpOnly` cookie (7-day expiry)
- Every authenticated request extracts and verifies the JWT from the cookie
- `authenticate` middleware gates all protected routes
- `requireRole(...)` middleware restricts endpoints by role (TEACHER, STUDENT, ADMIN)
- GitHub can also be linked as a secondary account (for repo access) without replacing the primary login provider

**Routes:**
- `GET /api/auth/google` → Google OAuth redirect
- `GET /api/auth/google/callback` → Creates/finds user, sets JWT cookie, redirects to `/dashboard`
- `GET /api/auth/github` → GitHub OAuth login
- `GET /api/auth/github/link` → Link GitHub to existing account (passes userId in OAuth state)
- `GET /api/auth/github/callback` → Unified handler — checks state to decide login vs. link
- `GET /api/auth/me` → Returns current user + connected accounts
- `POST /api/auth/logout` → Clears JWT cookie
- `DELETE /api/auth/github/disconnect` → Removes linked GitHub account

**Frontend:**
- `AuthContext` provides `user`, `isAuthenticated`, `login()`, `logout()`, `refreshUser()`, `updateRole()`
- `ProtectedRoute` component wraps routes — redirects to `/login` if unauthenticated, redirects to role-specific dashboard if wrong role

---

### 2. Workspace Management

**How it works:**
- Each workspace gets a directory at `server/workspaces/<workspaceId>/project/`
- 15 templates available: blank, dsa, static, react, nextjs, vue, angular, express, typescript, etc.
- Provisioning is streamed via SSE — the client receives real-time logs (npm install progress, etc.)
- File operations have path traversal protection (resolved paths must stay within workspace root)

**Routes:**
- `GET /api/workspace/:id` → Workspace info + template metadata + run command
- `GET /api/workspace/:id/setup` (SSE) → Stream provisioning logs
- `POST /api/workspace/:id/init` → Initialize template files
- `GET /api/workspace/:id/files` → Full recursive file tree (configurable depth)
- `GET /api/workspace/:id/files/list` → Directory listing (dirs sorted first)
- `GET /api/workspace/:id/files/all` → Flat file list (for Quick Open)
- `GET /api/workspace/:id/files/read` → Read file content
- `PUT /api/workspace/:id/files/write` → Write file (creates parent dirs)
- `POST /api/workspace/:id/files/create` → Create file or directory
- `PUT /api/workspace/:id/files/rename` → Rename/move
- `DELETE /api/workspace/:id/files/delete` → Delete (recursive for dirs)

**Provisioner (`lib/provisioner.ts`):**
- Spawns shell commands (npm install, npx create-react-app, git clone, etc.)
- Streams stdout/stderr to SSE callback
- Handles: blank, dsa (multi-lang), static (HTML/CSS/JS), react, nextjs, vue, angular, express, typescript

**Watcher (`lib/workspace-watcher.ts`):**
- Uses chokidar to watch workspace directories
- Ignores: node_modules, .git, dist, build, .next, __pycache__, .cache, .turbo, .vercel
- 150ms debounce for write stability
- Broadcasts `fs-change` events to connected terminal WebSocket clients

---

### 3. Code Editor (Monaco)

**How it works:**
- Uses `@monaco-editor/react` with VS Dark theme
- Multi-tab interface with dirty file indicators
- Tab management: open, close, switch (preserves scroll position)
- Editor content synced with file tabs — language auto-detected by extension
- Ctrl+S triggers save via `editor.addCommand(KeyMod.CtrlCmd | KeyCode.KeyS)`

**Editor options:**
- JetBrains Mono font, font ligatures, line height 20
- Minimap, bracket pair colorization, auto-closing brackets/quotes
- Word wrap, format on paste, smooth scrolling, cursor animations
- Quick suggestions for keywords, snippets, trigger characters
- Inline suggest enabled

---

### 4. Terminal

**How it works:**
- Real PTY sessions via `node-pty` (xterm-256color, bash shell)
- Each terminal has a unique ID and WebSocket connection
- Frontend uses `@xterm/xterm` with fit addon (auto-resizes to container)
- WebSocket path: `/ws/terminal/:workspaceId/:terminalId?token=<wsToken>`
- wsToken is a short-lived JWT issued when creating a terminal

**Features:**
- Multiple terminal tabs per workspace
- Scrollback buffer: 64KB circular buffer per terminal, replayed on reconnect
- Terminal resize: client sends cols/rows, server resizes PTY
- Port detection: regex scans terminal output for `localhost:PORT` patterns
- Filesystem change events broadcast to all connected terminal WS clients
- Stale terminal cleanup: exited terminals pruned after 5 minutes

**Routes:**
- `POST /api/workspace/:id/terminal` → Create PTY terminal (returns terminalId + wsToken)
- `GET /api/workspace/:id/terminals` → List terminals
- `POST /api/workspace/:id/terminal/:terminalId/attach` → Reconnect (new wsToken)
- `DELETE /api/workspace/:id/terminal/:terminalId` → Kill terminal
- `POST /api/workspace/:id/terminal/:terminalId/resize` → Resize

**Session Manager (`lib/session-manager.ts`):**
- Tracks all terminals, ports, and UI state per workspace
- UI state persisted: previewOpen, activePreviewPort, showTerminal, sidebarPanel
- Validates ports are reachable via TCP connect test
- Returns full session snapshot for page restore

---

### 5. Live Preview

**How it works:**
- When a dev server starts (e.g., Vite on port 5173), the port is detected from terminal output
- Preview loads in an iframe via: `/api/preview/:workspaceId/:port/*`
- Backend proxies HTTP requests to `localhost:PORT`, stripping CSP/X-Frame-Options headers
- A tracking cookie (`__orbit_preview_port`) enables root-relative request proxying

**Preview Fallback (`middleware/preview-fallback.ts`):**
- Catches requests like `/@vite/client`, `/src/main.tsx` from preview iframes
- Extracts port from Referer header or cookie
- Proxies to the correct dev server
- Solves nested ES module imports where Referer doesn't point to preview URL

**WebSocket Proxy:**
- Server upgrades WebSocket connections for Vite HMR
- Extracts port from cookie, authenticates via JWT, proxies to `localhost:PORT`

---

### 6. Git Integration

**How it works:**
- Uses `simple-git` library wrapping the git CLI
- Before git operations, decrypts the user's GitHub access token from ConnectedAccount
- Configures git user.name and user.email from the connected GitHub profile
- Remote URLs include token for authenticated push/pull: `https://x-access-token:<token>@github.com/...`

**Routes:**
- `POST /api/workspace-git/:id/init` → git init + initial commit
- `GET /api/workspace-git/:id/status` → Branch, modified/staged/untracked files with status codes
- `POST /api/workspace-git/:id/stage` → Stage specific files or all
- `POST /api/workspace-git/:id/unstage` → Unstage files
- `POST /api/workspace-git/:id/commit` → Commit with message
- `POST /api/workspace-git/:id/push` → Push to remote
- `POST /api/workspace-git/:id/pull` → Pull from remote
- `GET /api/workspace-git/:id/branch` → List branches + current
- `POST /api/workspace-git/:id/branch` → Create or switch branch
- `GET /api/workspace-git/:id/diff` → Original vs. modified file content

**Frontend (`GitPanel.tsx`):**
- Status view showing branch name and changed files
- Stage/unstage individual files or all
- Commit message input + commit button
- Push/pull buttons
- Branch switching and creation
- Click on modified file opens DiffViewer (side-by-side diff)

---

### 7. GitHub Integration

**Routes:**
- `GET /api/github/repos` → Paginated list of user's repos (name, language, stars, forks, etc.)
- `GET /api/github/profile` → GitHub profile (login, bio, public repos, followers)
- `GET /api/github/stats` → Aggregated: total stars, total forks, contribution heatmap (last 90 days), top languages
- `POST /api/github/import-repo` → Clone a GitHub repo into a new workspace
- `POST /api/github/create-repo` → Create a new GitHub repo, optionally linked to a workspace

**Frontend dashboard sections:**
- `GitHubOverview` — Profile card, contribution heatmap, top languages
- `GitHubRepos` — Paginated repo list with import button
- `GitHubConnectCard` — Connect/disconnect GitHub account
- `ConnectedAccounts` — Shows all linked OAuth providers

---

### 8. Classroom System

**How it works:**
- Teachers create classrooms with auto-generated 6-character join codes
- Students join by entering the code
- ClassroomMember join table tracks role (STUDENT/TEACHER)

**Routes:**
- `POST /api/classrooms` → Create classroom (TEACHER only, generates unique joinCode)
- `POST /api/classrooms/join` → Join by code
- `GET /api/classrooms/my` → List user's classrooms (with member count, teacher info)
- `GET /api/classrooms/:id` → Single classroom detail (membership verified)
- `GET /api/classrooms/:id/students` → Student list (TEACHER only)

---

### 9. Assignments & Grading

**Assignment Types:**
1. **WEB_DEV** — Template-based web development projects (React, Vue, static HTML, etc.)
2. **DSA** — Data structures & algorithms problems with test cases (C++, Python, Java)

**How it works:**
- Teacher creates assignment → selects type, difficulty, deadline, max marks, starter code
- For DSA: adds test cases (input, expected output, hidden/visible, weight)
- AI can generate assignment content (problem statement, starter code, test cases) via Gemini API
- Student starts assignment → workspace provisioned with starter code → Submission record created (IN_PROGRESS)
- Student submits → for DSA, test cases run via `code-runner.ts`:
  - C++: g++ -std=c++17 compile → execute (10s timeout per test)
  - Python: direct execution (10s timeout)
  - Java: javac compile → java -cp execute (10s timeout)
  - Each test returns: passed, actualOutput, expectedOutput, executionTime, error
- Teacher can grade submissions manually and add feedback

**Routes:**
- `POST /api/assignments` → Create assignment
- `GET /api/assignments/classroom/:classroomId` → List assignments (includes submission status for students)
- `GET /api/assignments/:id` → Assignment detail (hidden test cases filtered for students)
- `POST /api/assignments/:id/start` → Create workspace + submission
- `POST /api/assignments/:id/submit` → Submit (runs tests for DSA)
- `GET /api/assignments/:id/submissions` → All submissions (TEACHER)
- `POST /api/assignments/submissions/:id/grade` → Grade + feedback
- `GET /api/assignments/my/submissions` → Student's submissions
- `DELETE /api/assignments/:id` → Delete assignment

**AI Generation (`routes/assignment-ai.ts`):**
- `POST /api/assignments/ai/generate` → Uses Gemini API to generate:
  - DSA: problem statement, starter code templates, sample test cases
  - WEB_DEV: project description, requirements checklist

---

### 10. AI Code Completion (Codeium)

**Architecture:**
```
User types in editor
        ↓ (400ms debounce)
Client: POST /api/ai/autocomplete
  body: { prefix, suffix, language, cursorLine, cursorColumn }
        ↓
Server: Proxy to Codeium GetCompletions API
  Uses CODEIUM_API_KEY from environment
        ↓
Server: Return { completions: [{ text: "..." }] }
        ↓
Client: Display as ghost text (Monaco inline suggestion)
        ↓
User presses Tab to accept
```

**Backend (`routes/ai.ts`):**
- Authenticated endpoint
- Proxies to Codeium’s `GetCompletions` via Connect protocol (JSON over HTTP)
- Maps Monaco language IDs to Codeium language enum
- Uses `CODEIUM_API_KEY` from environment

**Frontend (`lib/codeium.ts`):**
- `registerCodeiumCompletionProvider(monaco)` — registers `InlineCompletionsProvider`
- 400ms debounce timer (cleared on each keystroke)
- Context: last 200 lines before cursor + 50 lines after
- AbortController cancels previous requests when user keeps typing
- Returns disposable for cleanup

---

### 11. Command Palette & Quick Open

- **Command Palette** (`Ctrl+Shift+P`): Searchable list of actions — run, stop, save, format, refresh files, create file/folder, open terminal, open preview
- **Quick Open** (`Ctrl+P`): Fuzzy file search across all workspace files, opens selected file in editor

---

### 12. Session Persistence

**How it works:**
- On IDE mount, fetches full session state from `GET /api/workspace/:id/session`
- Restores: open terminals, active preview port, UI state (sidebar panel, preview visibility, terminal visibility)
- On unmount or navigation, saves UI state via `PUT /api/workspace/:id/session/ui-state`
- Terminal scrollback replayed on WebSocket reconnect

---

### 13. Security

- **Helmet** — HTTP security headers (CSP, HSTS, etc.) — skipped for preview proxy routes
- **CORS** — Restricted to CLIENT_URL origin
- **AES-256-GCM** — OAuth tokens encrypted at rest (IV:TAG:CIPHERTEXT format)
- **JWT** — httpOnly cookies, 7-day expiry, verified on every request
- **Path traversal protection** — All file operations resolve paths and verify they stay within workspace root
- **WebSocket auth** — Short-lived JWT tokens for terminal/preview connections
- **Port validation** — Preview proxy validates port range (1-65535) and workspace ownership

---

## API Route Summary

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/api/auth/google` | No | Google OAuth redirect |
| GET | `/api/auth/google/callback` | No | Google OAuth callback |
| GET | `/api/auth/github` | No | GitHub OAuth login |
| GET | `/api/auth/github/link` | Yes | Link GitHub account |
| GET | `/api/auth/github/callback` | No | Unified GitHub callback |
| GET | `/api/auth/me` | Yes | Current user |
| POST | `/api/auth/logout` | Yes | Logout |
| DELETE | `/api/auth/github/disconnect` | Yes | Unlink GitHub |
| GET | `/api/github/repos` | Yes | GitHub repos (paginated) |
| GET | `/api/github/profile` | Yes | GitHub profile |
| GET | `/api/github/stats` | Yes | GitHub stats + contributions |
| POST | `/api/github/import-repo` | Yes | Import repo to workspace |
| POST | `/api/github/create-repo` | Yes | Create GitHub repo |
| GET | `/api/user/workspaces` | Yes | List workspaces |
| POST | `/api/user/workspaces` | Yes | Create workspace |
| DELETE | `/api/user/workspaces/:id` | Yes | Delete workspace |
| PATCH | `/api/user/role` | Yes | Switch role |
| GET | `/api/workspace/:id` | Yes | Workspace info |
| GET | `/api/workspace/:id/setup` | Yes | SSE provisioning logs |
| POST | `/api/workspace/:id/init` | Yes | Init template files |
| GET | `/api/workspace/:id/files` | Yes | File tree |
| GET | `/api/workspace/:id/files/list` | Yes | Directory listing |
| GET | `/api/workspace/:id/files/all` | Yes | All files (flat) |
| GET | `/api/workspace/:id/files/read` | Yes | Read file |
| PUT | `/api/workspace/:id/files/write` | Yes | Write file |
| POST | `/api/workspace/:id/files/create` | Yes | Create file/dir |
| PUT | `/api/workspace/:id/files/rename` | Yes | Rename/move |
| DELETE | `/api/workspace/:id/files/delete` | Yes | Delete file/dir |
| POST | `/api/workspace-git/:id/init` | Yes | git init |
| GET | `/api/workspace-git/:id/status` | Yes | Git status |
| POST | `/api/workspace-git/:id/stage` | Yes | Stage files |
| POST | `/api/workspace-git/:id/unstage` | Yes | Unstage files |
| POST | `/api/workspace-git/:id/commit` | Yes | Commit |
| POST | `/api/workspace-git/:id/push` | Yes | Push |
| POST | `/api/workspace-git/:id/pull` | Yes | Pull |
| GET | `/api/workspace-git/:id/branch` | Yes | List branches |
| POST | `/api/workspace-git/:id/branch` | Yes | Create/switch branch |
| GET | `/api/workspace-git/:id/diff` | Yes | File diff |
| POST | `/api/workspace/:id/terminal` | Yes | Create terminal |
| GET | `/api/workspace/:id/terminals` | Yes | List terminals |
| POST | `/api/workspace/:id/terminal/:tid/attach` | Yes | Reconnect terminal |
| DELETE | `/api/workspace/:id/terminal/:tid` | Yes | Kill terminal |
| POST | `/api/workspace/:id/terminal/:tid/resize` | Yes | Resize terminal |
| GET | `/api/workspace/:id/session` | Yes | Full session state |
| PUT | `/api/workspace/:id/session/ui-state` | Yes | Save UI state |
| GET | `/api/workspace/:id/ports` | Yes | Active ports |
| POST | `/api/workspace/:id/run` | Yes | Run process |
| POST | `/api/workspace/:id/stop` | Yes | Stop process |
| GET | `/api/workspace/:id/output` | Yes | Poll output |
| POST | `/api/workspace/:id/exec` | Yes | Execute command (30s) |
| ALL | `/api/preview/:id/:port/*` | Yes | HTTP proxy to dev server |
| POST | `/api/classrooms` | Yes | Create classroom |
| POST | `/api/classrooms/join` | Yes | Join classroom |
| GET | `/api/classrooms/my` | Yes | My classrooms |
| GET | `/api/classrooms/:id` | Yes | Classroom detail |
| GET | `/api/classrooms/:id/students` | Yes | Student list |
| POST | `/api/assignments` | Yes | Create assignment |
| GET | `/api/assignments/classroom/:id` | Yes | Classroom assignments |
| GET | `/api/assignments/:id` | Yes | Assignment detail |
| POST | `/api/assignments/:id/start` | Yes | Start assignment |
| POST | `/api/assignments/:id/submit` | Yes | Submit assignment |
| GET | `/api/assignments/:id/submissions` | Yes | All submissions |
| POST | `/api/assignments/submissions/:id/grade` | Yes | Grade submission |
| GET | `/api/assignments/my/submissions` | Yes | My submissions |
| DELETE | `/api/assignments/:id` | Yes | Delete assignment |
| POST | `/api/assignments/ai/generate` | Yes | AI generate assignment |
| POST | `/api/ai/autocomplete` | Yes | Codeium code completion |
| WS | `/ws/terminal/:wid/:tid` | Token | Terminal WebSocket |
| GET | `/api/health` | No | Health check |

---

## Environment Variables

### Server (`server/.env`)

```env
PORT=5000
NODE_ENV=development
CLIENT_URL=http://localhost:5173

JWT_SECRET=<random-secret>
JWT_EXPIRES_IN=7d

ENCRYPTION_KEY=<64-char-hex-string>

GOOGLE_CLIENT_ID=<from-google-cloud-console>
GOOGLE_CLIENT_SECRET=<from-google-cloud-console>

GITHUB_CLIENT_ID=<from-github-developer-settings>
GITHUB_CLIENT_SECRET=<from-github-developer-settings>

DATABASE_URL=mongodb+srv://<user>:<password>@<cluster>.mongodb.net/Nebula

GEMINI_API_KEY=<google-gemini-api-key>

CODEIUM_API_KEY=<codeium-api-key>
```

---

## Setup & Run

```bash
# 1. Install dependencies
cd client && npm install --legacy-peer-deps
cd ../server && npm install

# 2. Configure environment
cd server && cp .env.example .env
# Edit .env with your MongoDB URI, OAuth credentials, etc.

# 3. Generate Prisma client
cd server && npx prisma generate && npx prisma db push

# 4. Run development servers
cd server && npm run dev    # Express on :5000
cd client && npm run dev    # Vite on :5173
```

**OAuth callback URLs to register:**
- Google: `http://localhost:5000/api/auth/google/callback`
- GitHub: `http://localhost:5000/api/auth/github/callback`

---

## User Roles

| Role | Capabilities |
|---|---|
| **STUDENT** | Create workspaces, use IDE, join classrooms, start/submit assignments, view grades, connect GitHub |
| **TEACHER** | All student capabilities + create classrooms, create/delete assignments, AI-generate assignments, grade submissions, view student lists |
| **ADMIN** | (Reserved for future use) |

---

## Templates Available

| Template | Language | Description |
|---|---|---|
| blank | — | Empty workspace |
| dsa | C++/Python/Java | DSA problem solving |
| static | HTML/CSS/JS | Static website |
| react | JavaScript | React (Vite) |
| nextjs | JavaScript | Next.js |
| vue | JavaScript | Vue.js (Vite) |
| angular | TypeScript | Angular |
| express | JavaScript | Express.js API |
| typescript | TypeScript | TypeScript project |
| + 6 more | Various | Additional templates |

---

## Real-Time Communication

| Channel | Protocol | Purpose |
|---|---|---|
| Terminal I/O | WebSocket | Bidirectional PTY data |
| Filesystem changes | WebSocket (via terminal) | File add/change/delete notifications |
| Preview HMR | WebSocket (proxied) | Vite hot module replacement |
| Provisioning logs | Server-Sent Events | Streaming setup progress |
| Port detection | WebSocket (via terminal) | Dev-server URL scanning from stdout |
