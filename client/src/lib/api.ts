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
};

// User endpoints
export const userAPI = {
  getWorkspaces: () => api.get("/user/workspaces"),
  createWorkspace: (data: {
    name: string;
    description?: string;
    language?: string;
  }) => api.post("/user/workspaces", data),
  deleteWorkspace: (id: string) => api.delete(`/user/workspaces/${id}`),
  getAssignments: () => api.get("/user/assignments"),
};

export default api;
