import axios from "axios";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5000";

export { API_BASE };

const api = axios.create({
  baseURL: `${API_BASE}/api`,
  withCredentials: true, // Send cookies with every request
  headers: {
    "Content-Type": "application/json",
  },
});

// Auth endpoints
export const authAPI = {
  getMe: () => api.get("/auth/me"),
  logout: () => api.post("/auth/logout"),
  checkEmail: (email: string) => api.get(`/auth/check-email?email=${encodeURIComponent(email)}`),
  // OAuth URLs (redirect, not AJAX) - now support mode and role params
  googleLoginUrl: `${API_BASE}/api/auth/google?mode=login`,
  githubLoginUrl: `${API_BASE}/api/auth/github?mode=login`,
  googleSignupUrl: (role: string) => `${API_BASE}/api/auth/google?mode=signup&role=${role}`,
  githubSignupUrl: (role: string) => `${API_BASE}/api/auth/github?mode=signup&role=${role}`,
  githubLinkUrl: `${API_BASE}/api/auth/github/link`,
  disconnectGitHub: () => api.delete("/auth/github/disconnect"),
};

// GitHub endpoints
export const githubAPI = {
  getRepos: (page = 1, perPage = 30) =>
    api.get(`/github/repos?page=${page}&per_page=${perPage}`),
  getProfile: () => api.get("/github/profile"),
  getStats: () => api.get("/github/stats"),
  importRepo: (data: {
    repoName: string;
    repoUrl: string;
    language?: string;
    description?: string;
  }) => api.post("/github/import-repo", data),
  createRepo: (data: {
    name: string;
    description?: string;
    isPrivate?: boolean;
    workspaceId?: string;
  }) => api.post("/github/create-repo", data),
};

// User endpoints
export const userAPI = {
  getWorkspaces: () => api.get("/user/workspaces"),
  createWorkspace: (data: {
    name: string;
    description?: string;
    language?: string;
    template?: string;
    visibility?: string;
  }) => api.post("/user/workspaces", data),
  deleteWorkspace: (id: string) => api.delete(`/user/workspaces/${id}`),
  getAssignments: () => api.get("/user/assignments"),
  createAssignment: (data: {
    title: string;
    description?: string;
    dueDate?: string;
  }) => api.post("/user/assignments", data),
  updateRole: (role: "STUDENT" | "TEACHER") =>
    api.patch("/user/role", { role }),
};

// Classroom endpoints
export const classroomAPI = {
  create: (data: { name: string; description?: string }) =>
    api.post("/classrooms", data),
  join: (joinCode: string) =>
    api.post("/classrooms/join", { joinCode }),
  getMy: () =>
    api.get("/classrooms/my"),
  getOne: (id: string) =>
    api.get(`/classrooms/${id}`),
  getStudents: (id: string) =>
    api.get(`/classrooms/${id}/students`),
  getLeaderboard: (id: string) =>
    api.get(`/classrooms/${id}/leaderboard`),
  getAnalytics: (id: string) =>
    api.get(`/classrooms/${id}/analytics`),
  getStudentProgress: (id: string, studentId: string) =>
    api.get(`/classrooms/${id}/students/${studentId}/progress`),
};

// Classroom blog endpoints
export const blogAPI = {
  create: (classroomId: string, data: { title: string; content: string }) =>
    api.post(`/classrooms/${classroomId}/blogs`, data),
  getForClassroom: (classroomId: string) =>
    api.get(`/classrooms/${classroomId}/blogs`),
  getOne: (id: string) =>
    api.get(`/blogs/${id}`),
  update: (id: string, data: { title: string; content: string }) =>
    api.put(`/blogs/${id}`, data),
  delete: (id: string) =>
    api.delete(`/blogs/${id}`),
};

// Assignment endpoints
export const assignmentAPI = {
  create: (data: {
    classroomId: string;
    title: string;
    description?: string;
    type: "WEB_DEV" | "DSA";
    difficulty?: string;
    template?: string;
    assignmentConfig?: {
      template: string;
      lockedFiles: string[];
      editableFiles: string[];
      referenceImages: string[];
      instructions: string;
    };
    starterCode?: Record<string, string>;
    language?: string;
    timeLimit?: number;
    deadline?: string;
    maxMarks?: number;
    aiAllowed?: boolean;
    testCases?: { input: string; expectedOutput: string; weight?: number; isHidden?: boolean }[];
  }) => api.post("/assignments", data),

  getForClassroom: (classroomId: string) =>
    api.get(`/assignments/classroom/${classroomId}`),

  getOne: (id: string) =>
    api.get(`/assignments/${id}`),

  start: (id: string) =>
    api.post(`/assignments/${id}/start`),

  submit: (id: string, data?: { workspaceId?: string }) =>
    api.post(`/assignments/${id}/submit`, data || {}),

  getSubmissions: (id: string) =>
    api.get(`/assignments/${id}/submissions`),

  getSubmissionDeployment: (submissionId: string) =>
    api.get(`/submissions/${submissionId}/deployment`),

  gradeSubmission: (submissionId: string, data: { score: number; feedback?: string }) =>
    api.post(`/assignments/submissions/${submissionId}/grade`, data),

  getMySubmissions: () =>
    api.get("/assignments/my/submissions"),

  getMyAll: () =>
    api.get("/assignments/my/all"),

  delete: (id: string) =>
    api.delete(`/assignments/${id}`),

  aiGenerate: (data: { topic: string; difficulty: "EASY" | "MEDIUM" | "HARD"; language: "cpp" | "python" | "java" }) =>
    api.post("/assignments/ai/generate", data),
};

// DSA playground endpoints
export const dsaAPI = {
  run: (data: {
    assignmentId: string;
    code: string;
    language: "cpp" | "python" | "java";
    customInput?: string;
    customExpectedOutput?: string;
  }) => api.post("/dsa/run", data),

  submit: (data: {
    assignmentId: string;
    code: string;
    language: "cpp" | "python" | "java";
  }) => api.post("/dsa/submit", data),

  getSubmission: (submissionId: string) =>
    api.get(`/dsa/submission/${submissionId}`),
};

// Workspace IDE endpoints
export const workspaceAPI = {
  // Info & init
  getWorkspace: (id: string) => api.get(`/workspace/${id}`),
  initWorkspace: (id: string) => api.post(`/workspace/${id}/init`),
  /** SSE URL for streaming workspace provisioning logs */
  setupStreamUrl: (id: string) => `${API_BASE}/api/workspace/${id}/setup`,

  // File system
  getFileTree: (id: string) => api.get(`/workspace/${id}/files`),
  listDir: (id: string, path: string) =>
    api.get(`/workspace/${id}/files/list`, { params: { path } }),
  readFile: (id: string, path: string) =>
    api.get(`/workspace/${id}/files/read`, { params: { path } }),
  writeFile: (id: string, path: string, content: string) =>
    api.put(`/workspace/${id}/files/write`, { path, content }),
  createEntry: (id: string, path: string, type: "file" | "directory") =>
    api.post(`/workspace/${id}/files/create`, { path, type }),
  renameEntry: (id: string, oldPath: string, newPath: string) =>
    api.put(`/workspace/${id}/files/rename`, { oldPath, newPath }),
  deleteEntry: (id: string, path: string) =>
    api.delete(`/workspace/${id}/files/delete`, { params: { path } }),
  getAllFiles: (id: string) =>
    api.get<{ files: string[] }>(`/workspace/${id}/files/all`),

  // Git operations
  gitInit: (id: string) => api.post(`/workspace-git/${id}/init`),
  gitStatus: (id: string) => api.get(`/workspace-git/${id}/status`),
  gitStage: (id: string, files?: string[]) =>
    api.post(`/workspace-git/${id}/stage`, { files }),
  gitUnstage: (id: string, files?: string[]) =>
    api.post(`/workspace-git/${id}/unstage`, { files }),
  gitCommit: (id: string, message: string) =>
    api.post(`/workspace-git/${id}/commit`, { message }),
  gitPush: (id: string) => api.post(`/workspace-git/${id}/push`),
  gitPull: (id: string) => api.post(`/workspace-git/${id}/pull`),
  gitBranch: (id: string) => api.get(`/workspace-git/${id}/branch`),
  gitSwitchBranch: (id: string, name: string, create?: boolean) =>
    api.post(`/workspace-git/${id}/branch`, { name, create }),
  gitDiff: (id: string, file: string) =>
    api.get<{ original: string; modified: string; filePath: string }>(
      `/workspace-git/${id}/diff`,
      { params: { file } }
    ),

  // Run & terminal (legacy)
  run: (id: string, command?: string) =>
    api.post(`/workspace-run/${id}/run`, { command }),
  stop: (id: string) => api.post(`/workspace-run/${id}/stop`),
  getOutput: (id: string, since?: number) =>
    api.get(`/workspace-run/${id}/output`, { params: { since } }),
  exec: (id: string, command: string) =>
    api.post(`/workspace-run/${id}/exec`, { command }),

  // PTY terminal sessions
  createTerminal: (id: string) =>
    api.post(`/workspace/${id}/terminal`),
  listTerminals: (id: string) =>
    api.get<{ terminals: { id: string; createdAt: string; exited: boolean; exitCode: number | null }[] }>(`/workspace/${id}/terminals`),
  attachTerminal: (id: string, terminalId: string) =>
    api.post<{ terminalId: string; workspaceId: string; wsToken: string; exited: boolean; exitCode: number | null }>(`/workspace/${id}/terminal/${terminalId}/attach`),
  killTerminal: (id: string, terminalId: string) =>
    api.delete(`/workspace/${id}/terminal/${terminalId}`),
  resizeTerminal: (id: string, terminalId: string, cols: number, rows: number) =>
    api.post(`/workspace/${id}/terminal/${terminalId}/resize`, { cols, rows }),

  // Preview ports
  getActivePorts: (id: string) =>
    api.get<{ ports: number[] }>(`/workspace/${id}/ports`),

  // Session persistence — single call to restore workspace state
  getSession: (id: string) =>
    api.get<{
      active: boolean;
      terminals: { id: string; createdAt: string; exited: boolean; exitCode: number | null }[];
      ports: number[];
      uiState: {
        previewOpen: boolean;
        activePreviewPort: number | null;
        showTerminal: boolean;
        sidebarPanel: string;
      };
    }>(`/workspace/${id}/session`),

  // Save IDE UI state (preview, terminal panel, sidebar)
  saveUIState: (id: string, state: {
    previewOpen?: boolean;
    activePreviewPort?: number | null;
    showTerminal?: boolean;
    sidebarPanel?: string;
  }) => api.put(`/workspace/${id}/session/ui-state`, state),

  // Context / AI debugging
  indexContext: (id: string) =>
    api.post(`/workspace/${id}/context/index`),
  getContext: (id: string) =>
    api.get(`/workspace/${id}/context`),
  buildContext: (id: string, file: string, errorLine: number) =>
    api.post<{
      projectStructure: string[];
      dependencies: string[];
      currentFile: { path: string; code: string } | null;
      relatedFiles: { path: string; code: string }[];
      errorLine: number;
    }>(`/workspace/${id}/context/build`, { file, errorLine }),
};

// AI error-fix endpoint
export const aiAPI = {
  errorFix: (data: {
    workspaceId: string;
    filePath: string;
    errorLine: number;
    errorMessage: string;
  }) =>
    api.post<{
      explanation: string;
      suggestedFix: string;
      correctedCode: string;
    }>("/ai/error-fix", data),
};

export default api;
