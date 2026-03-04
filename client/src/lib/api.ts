import axios from "axios";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5000";

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
  // OAuth URLs (redirect, not AJAX)
  googleLoginUrl: `${API_BASE}/api/auth/google`,
  githubLoginUrl: `${API_BASE}/api/auth/github`,
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
};

// Workspace IDE endpoints
export const workspaceAPI = {
  // Info & init
  getWorkspace: (id: string) => api.get(`/workspace/${id}`),
  initWorkspace: (id: string) => api.post(`/workspace/${id}/init`),

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

  // Git operations
  gitInit: (id: string) => api.post(`/workspace-git/${id}/init`),
  gitStatus: (id: string) => api.get(`/workspace-git/${id}/status`),
  gitCommit: (id: string, message: string) =>
    api.post(`/workspace-git/${id}/commit`, { message }),
  gitPush: (id: string) => api.post(`/workspace-git/${id}/push`),
  gitPull: (id: string) => api.post(`/workspace-git/${id}/pull`),
  gitBranch: (id: string) => api.get(`/workspace-git/${id}/branch`),
  gitSwitchBranch: (id: string, name: string, create?: boolean) =>
    api.post(`/workspace-git/${id}/branch`, { name, create }),

  // Run & terminal
  run: (id: string, command?: string) =>
    api.post(`/workspace-run/${id}/run`, { command }),
  stop: (id: string) => api.post(`/workspace-run/${id}/stop`),
  getOutput: (id: string, since?: number) =>
    api.get(`/workspace-run/${id}/output`, { params: { since } }),
  exec: (id: string, command: string) =>
    api.post(`/workspace-run/${id}/exec`, { command }),
};

export default api;
