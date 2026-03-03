import { Router, Request, Response } from "express";
import { authenticate } from "../middleware/auth";
import prisma from "../lib/prisma";
import { decrypt } from "../lib/encryption";

interface GitHubRepo {
  id: number;
  name: string;
  full_name: string;
  description: string | null;
  private: boolean;
  html_url: string;
  clone_url: string;
  language: string | null;
  stargazers_count: number;
  forks_count: number;
  updated_at: string;
  default_branch: string;
}

interface GitHubProfile {
  login: string;
  name: string;
  avatar_url: string;
  bio: string;
  public_repos: number;
  followers: number;
  following: number;
}

const router = Router();

// Helper: get decrypted GitHub token for current user
async function getGitHubToken(userId: string): Promise<string | null> {
  const account = await prisma.connectedAccount.findUnique({
    where: {
      userId_provider: {
        userId,
        provider: "github",
      },
    },
  });

  if (!account) return null;
  return decrypt(account.accessToken);
}

// ── Fetch user repositories ────────────────────────────
router.get("/repos", authenticate, async (req: Request, res: Response) => {
  try {
    const token = await getGitHubToken(req.user!.userId);
    if (!token) {
      res.status(400).json({ error: "GitHub account not connected" });
      return;
    }

    const page = parseInt(req.query.page as string) || 1;
    const perPage = parseInt(req.query.per_page as string) || 30;
    const sort = (req.query.sort as string) || "updated";

    const response = await fetch(
      `https://api.github.com/user/repos?page=${page}&per_page=${perPage}&sort=${sort}&affiliation=owner`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/vnd.github.v3+json",
          "User-Agent": "Nebula-IDE",
        },
      }
    );

    if (!response.ok) {
      const error = await response.text();
      console.error("GitHub API error:", error);
      res.status(response.status).json({ error: "Failed to fetch repos" });
      return;
    }

    const repos = (await response.json()) as GitHubRepo[];

    // Return only safe fields — never expose tokens
    const sanitized = repos.map((repo) => ({
      id: repo.id,
      name: repo.name,
      fullName: repo.full_name,
      description: repo.description,
      isPrivate: repo.private,
      htmlUrl: repo.html_url,
      cloneUrl: repo.clone_url,
      language: repo.language,
      stars: repo.stargazers_count,
      forks: repo.forks_count,
      updatedAt: repo.updated_at,
      defaultBranch: repo.default_branch,
    }));

    res.json({ repos: sanitized });
  } catch (error) {
    console.error("Fetch repos error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ── Get GitHub user profile ────────────────────────────
router.get("/profile", authenticate, async (req: Request, res: Response) => {
  try {
    const token = await getGitHubToken(req.user!.userId);
    if (!token) {
      res.status(400).json({ error: "GitHub account not connected" });
      return;
    }

    const response = await fetch("https://api.github.com/user", {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github.v3+json",
        "User-Agent": "Nebula-IDE",
      },
    });

    if (!response.ok) {
      res.status(response.status).json({ error: "Failed to fetch profile" });
      return;
    }

    const profile = (await response.json()) as GitHubProfile;

    res.json({
      profile: {
        login: profile.login,
        name: profile.name,
        avatar: profile.avatar_url,
        bio: profile.bio,
        publicRepos: profile.public_repos,
        followers: profile.followers,
        following: profile.following,
      },
    });
  } catch (error) {
    console.error("GitHub profile error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ── Get GitHub stats (total stars, repos, followers) ───
router.get("/stats", authenticate, async (req: Request, res: Response) => {
  try {
    const token = await getGitHubToken(req.user!.userId);
    if (!token) {
      res.status(400).json({ error: "GitHub account not connected" });
      return;
    }

    const headers = {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github.v3+json",
      "User-Agent": "Nebula-IDE",
    };

    // First fetch profile to get the GitHub username
    const [profileRes, reposRes] = await Promise.all([
      fetch("https://api.github.com/user", { headers }),
      fetch("https://api.github.com/user/repos?per_page=100&affiliation=owner", { headers }),
    ]);

    if (!profileRes.ok || !reposRes.ok) {
      res.status(500).json({ error: "Failed to fetch GitHub stats" });
      return;
    }

    const profile = (await profileRes.json()) as GitHubProfile;

    // Now fetch events using the GitHub username
    const eventsRes = await fetch(
      `https://api.github.com/users/${profile.login}/events?per_page=100`,
      { headers }
    ).catch(() => null);

    const repos = (await reposRes.json()) as GitHubRepo[];

    const totalStars = repos.reduce((sum, r) => sum + r.stargazers_count, 0);
    const totalForks = repos.reduce((sum, r) => sum + r.forks_count, 0);

    // Build contribution heatmap from events (last 90 days)
    const contributions: Record<string, number> = {};
    if (eventsRes && eventsRes.ok) {
      const events = (await eventsRes.json()) as { type: string; created_at: string }[];
      for (const event of events) {
        if (["PushEvent", "CreateEvent", "PullRequestEvent", "IssuesEvent"].includes(event.type)) {
          const day = event.created_at.slice(0, 10);
          contributions[day] = (contributions[day] || 0) + 1;
        }
      }
    }

    // Get top languages from repos
    const langCounts: Record<string, number> = {};
    for (const repo of repos) {
      if (repo.language) {
        langCounts[repo.language] = (langCounts[repo.language] || 0) + 1;
      }
    }
    const topLanguages = Object.entries(langCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name, count]) => ({ name, count }));

    // Recent repos (last 5 updated)
    const recentRepos = repos
      .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
      .slice(0, 5)
      .map((repo) => ({
        id: repo.id,
        name: repo.name,
        fullName: repo.full_name,
        description: repo.description,
        isPrivate: repo.private,
        htmlUrl: repo.html_url,
        language: repo.language,
        stars: repo.stargazers_count,
        forks: repo.forks_count,
        updatedAt: repo.updated_at,
      }));

    res.json({
      stats: {
        totalRepos: profile.public_repos,
        followers: profile.followers,
        following: profile.following,
        totalStars,
        totalForks,
        topLanguages,
        recentRepos,
        contributions,
        profile: {
          login: profile.login,
          name: profile.name,
          avatar: profile.avatar_url,
          bio: profile.bio,
        },
      },
    });
  } catch (error) {
    console.error("GitHub stats error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ── Import repo as workspace ───────────────────────────
router.post(
  "/import-repo",
  authenticate,
  async (req: Request, res: Response) => {
    try {
      const { repoName, repoUrl, language, description } = req.body;

      if (!repoName || !repoUrl) {
        res.status(400).json({ error: "repoName and repoUrl are required" });
        return;
      }

      // Verify user has GitHub connected
      const token = await getGitHubToken(req.user!.userId);
      if (!token) {
        res.status(400).json({ error: "GitHub account not connected" });
        return;
      }

      // Create workspace from repo
      const workspace = await prisma.workspace.create({
        data: {
          name: repoName,
          description: description || null,
          language: language || null,
          repoUrl,
          repoName,
          isImported: true,
          userId: req.user!.userId,
        },
      });

      res.status(201).json({ workspace });
    } catch (error) {
      console.error("Import repo error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }
);

export default router;
