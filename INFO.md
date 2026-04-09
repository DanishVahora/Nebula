# Nebula - AI Cloud IDE and Deployment Platform

## 1. Project Overview

Nebula is a full-stack, browser-based cloud development platform that combines a modern IDE, AI-assisted debugging, and one-click deployment into a single workflow.

### What Nebula Is
- A web-native development environment where users can write, run, debug, and deploy applications without local setup.
- A role-aware platform that supports individual development as well as classroom-based learning and assessment.
- A multi-tenant architecture designed for isolated, per-workspace runtime execution.

### Problem It Solves
Traditional development workflows are often fragmented:
- Local environment setup is time-consuming and inconsistent.
- Coding, debugging, and deployment happen across separate tools.
- Classroom management and practical coding environments are disconnected.

Nebula unifies the complete lifecycle:
- Code
- Execute
- Debug
- Collaborate/Assess
- Deploy

### Key Capabilities
- Browser-based Cloud IDE
- Context-aware AI debugging assistant
- Integrated Git workflows
- Classroom and assignment lifecycle system
- Docker-based one-click deployment with shareable URLs

---

## 2. Core Features

### Cloud IDE
- Monaco-powered editor with language-aware editing support.
- Workspace file system explorer with create/read/write/rename/delete operations.
- Integrated multi-terminal support.
- Live preview panel via proxied workspace runtime ports.

### Real-Time Execution
- In-workspace process execution (run/stop/exec).
- Real-time output and event streaming.
- Session restoration for active terminals and IDE UI state.

### Git Integration
- Built-in status, stage/unstage, commit, pull, push, and branch operations.
- File diff visualization for changed files.
- GitHub account linkage for authenticated remote operations.

### AI Debugging
- Error explanation with probable root-cause analysis.
- Actionable fix suggestions with corrected code output.
- Workspace-context-aware reasoning using relevant project files and symbol metadata.

### Classroom and Assignment System
- Teacher/student role-based classroom model.
- Assignment creation, submission, grading, and tracking.
- DSA test-case execution pipeline and web-project assignment support.

### One-Click Deployment (Docker-Based)
- Workspace packaged and executed in isolated containers.
- Automatic runtime port handling and public endpoint exposure.
- Deployment lifecycle integrated directly into IDE workflow.

---

## 3. System Architecture

### High-Level Architecture
Nebula uses a layered architecture composed of:
- Frontend application (IDE + dashboard)
- Backend API and orchestration services
- Workspace runtime and deployment containers
- Proxy/routing layer for public access

### End-to-End Request Flow
User -> IDE -> Backend -> Container Runtime -> Deployment URL

### Layer-by-Layer Responsibilities

#### Frontend Layer
- Provides IDE, dashboard, classroom, and deployment interfaces.
- Manages authenticated API communication.
- Handles real-time streams (terminal I/O, logs, status events).

#### Backend Layer
- Exposes secured APIs for auth, workspace operations, Git, AI, and deployment.
- Enforces authorization and ownership checks.
- Orchestrates process execution, terminal sessions, and preview routing.

#### Runtime/Container Layer
- Runs code in isolated per-workspace execution environments.
- Manages resource boundaries and process lifecycle.
- Provides deployment-ready service runtime.

#### Routing Layer
- Maps workspace deployments to externally reachable URLs.
- Supports subdomain or route-based traffic forwarding.
- Enables multi-tenant request segregation.

---

## 4. Technology Stack

### Frontend
- React
- TypeScript
- Vite
- Tailwind CSS
- Monaco Editor

### Backend
- Node.js
- Express

### Database
- MongoDB
- Prisma ORM

### Dev and Runtime Tools
- Docker (workspace runtime and deployment)
- WebSocket (terminal and real-time events)
- Server-Sent Events (provisioning and streaming logs)

### AI Layer
- Google Gemini API (error analysis, fix generation, assignment assistance)

### Git Layer
- simple-git (Git command orchestration)

---

## 5. Project Flow (End-to-End)

1. User Login
- User authenticates via OAuth/session flow.
- Backend issues secure authentication token.

2. Workspace Creation
- User creates a workspace from a selected template.
- Backend provisions project files and initializes metadata.

3. Coding in IDE
- User edits files in Monaco.
- File changes are persisted through workspace APIs.

4. Running the Project
- User runs commands from IDE toolbar/terminal.
- Backend executes inside workspace runtime and streams output.

5. AI Debugging
- User sends error details to AI debugger.
- Backend builds project context and generates structured prompts.
- Gemini returns explanation, suggested fix, and corrected code.

6. Git Workflow
- User stages, commits, and pushes code from integrated Git panel.
- Remote synchronization occurs via linked Git credentials.

7. Deployment
- User triggers one-click deployment.
- Backend creates/updates Docker container runtime.
- Public deployment URL is generated and exposed.

8. Iteration
- User continues editing, debugging, and redeploying with minimal friction.

---

## 6. Deployment Architecture

### Container Strategy
- Each workspace is deployed in an isolated Docker container.
- Container image/runtime is scoped to project requirements.
- Isolation improves security and tenant separation.

### Port Management
- Runtime services bind internal container ports.
- Host/proxy mapping ensures non-conflicting external exposure.
- Active port metadata is tracked by backend session/runtime management.

### Reverse Proxy Routing
- Nginx or Traefik routes incoming traffic to correct container.
- Route targets are resolved from workspace deployment metadata.
- Supports TLS termination and consistent ingress handling.

### Subdomain-Based Access
- Recommended public URL pattern:
  - workspaceId.domain.com
- Simplifies tenant separation, sharing, and route management.

---

## 7. AI System Design

### Context Building Pipeline
- Collects error location and nearby source snippet.
- Expands context using imports, related files, and symbol extraction.
- Summarizes project structure to improve model grounding.

### Prompt Engineering Approach
- Structured prompts include:
  - Error message/stack trace
  - Relevant code snippets
  - Dependency and symbol context
  - Output format constraints
- Goal is deterministic, actionable AI output instead of generic advice.

### AI Debugging Flow
Error detected -> Context built -> Prompt generated -> Gemini called -> Response parsed -> UI renders explanation and fix

### Response Contract
- Root cause explanation
- Suggested resolution steps
- Corrected code block ready for application

---

## 8. Security Considerations

### Container Isolation
- Workspace execution sandboxed per container.
- Reduces cross-tenant interference risk.

### Authentication and Authorization
- JWT-based authenticated sessions.
- Role-based access controls for protected resources.

### Encrypted Tokens and Secrets
- OAuth/access tokens encrypted at rest.
- Sensitive credentials scoped and protected in backend services.

### Path Traversal Protection
- All filesystem paths normalized and validated against workspace root.
- Unauthorized path escapes are rejected.

### Additional Hardening
- CORS restrictions for trusted origins.
- Secure cookie/session handling.
- Input validation for API payloads.

---

## 9. Scalability and Future Improvements

### Container Orchestration
- Transition to Kubernetes for large-scale workspace scheduling.
- Improve resilience through self-healing and rolling updates.

### Load Balancing
- Horizontal backend scaling behind managed load balancers.
- Better distribution of API and websocket traffic.

### Auto-Scaling Deployments
- Scale workspace runtimes based on CPU/memory/request metrics.
- Idle-instance hibernation to optimize infrastructure cost.

### Collaboration Roadmap
- Real-time collaborative editing.
- Shared terminal sessions and presence indicators.
- Team-based workspace permissions and governance.

### Additional Platform Enhancements
- Deployment versioning and rollback support.
- Observability stack (logs, metrics, traces).
- Policy-driven runtime quotas and tenancy controls.

---

## 10. Folder Structure Overview

```text
Nebula/
|- client/
|  |- src/
|  |  |- components/
|  |  |- pages/
|  |  |- contexts/
|  |  |- lib/
|  |- public/
|- server/
|  |- src/
|  |  |- routes/
|  |  |- middleware/
|  |  |- lib/
|  |  |- config/
|  |- prisma/
|  |- workspaces/
```

### Directory Notes
- client:
  - React frontend for IDE, dashboards, assignment views, and deployment UI.
  - Contains editor-facing components, auth flows, and API interaction logic.

- server:
  - Express backend handling auth, workspace orchestration, terminals, AI, Git, and deployment operations.
  - Includes Prisma schema, service libraries, route handlers, and runtime workspace storage.

---

## 11. Conclusion

Nebula is a modern cloud-native development platform that unifies IDE experience, AI-assisted debugging, and deployment into a single system.

By combining isolated runtime execution, real-time tooling, integrated Git, AI context intelligence, and deployment automation, Nebula delivers a production-grade developer workflow for both builders and educators.

It positions itself as a complete, next-generation platform for building, learning, and shipping software directly from the browser.
