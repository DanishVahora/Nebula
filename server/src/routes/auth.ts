import { Router, Request, Response } from "express";
import passport from "../config/passport";
import { signToken } from "../lib/jwt";
import { encrypt } from "../lib/encryption";
import { authenticate } from "../middleware/auth";
import prisma from "../lib/prisma";
import { env } from "../config/env";

const router = Router();

// ── Cookie options ─────────────────────────────────────
const cookieOptions = {
  httpOnly: true,
  secure: env.NODE_ENV === "production",
  sameSite: "lax" as const,
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  path: "/",
};

// ── Google OAuth ───────────────────────────────────────
router.get("/google", passport.authenticate("google", { session: false }));

router.get(
  "/google/callback",
  passport.authenticate("google", {
    session: false,
    failureRedirect: `${env.CLIENT_URL}/login?error=google_auth_failed`,
  }),
  (req: Request, res: Response) => {
    const user = req.user as any;
    const token = signToken({
      userId: user.id,
      email: user.email,
      role: user.role,
    });

    res.cookie("token", token, cookieOptions);
    res.redirect(`${env.CLIENT_URL}/dashboard`);
  }
);

// ── GitHub OAuth (primary login) ───────────────────────
router.get(
  "/github",
  passport.authenticate("github", { session: false })
);

// ── GitHub OAuth (account linking) ─────────────────────
// Redirects to GitHub with a state param that carries the userId
router.get("/github/link", authenticate, (req: Request, res: Response) => {
  const state = `link_${req.user!.userId}`;
  const params = new URLSearchParams({
    client_id: env.GITHUB_CLIENT_ID,
    redirect_uri: `http://localhost:${env.PORT}/api/auth/github/callback`,
    scope: "user:email,repo",
    state,
  });
  res.redirect(`https://github.com/login/oauth/authorize?${params}`);
});

// ── GitHub OAuth callback (handles BOTH login + linking) ──
router.get(
  "/github/callback",
  passport.authenticate("github", {
    session: false,
    failureRedirect: `${env.CLIENT_URL}/login?error=github_auth_failed`,
  }),
  async (req: Request, res: Response) => {
    try {
      const data = req.user as any;
      const { accessToken, refreshToken, profile } = data;
      const state = (req.query.state as string) || "";

      // ─── LINK FLOW ───────────────────────────────
      if (state.startsWith("link_")) {
        const userId = state.replace("link_", "");

        // Verify user exists
        const existingUser = await prisma.user.findUnique({ where: { id: userId } });
        if (!existingUser) {
          res.redirect(`${env.CLIENT_URL}/dashboard?error=github_link_failed`);
          return;
        }

        await prisma.connectedAccount.upsert({
          where: {
            userId_provider: {
              userId,
              provider: "github",
            },
          },
          update: {
            accessToken: encrypt(accessToken),
            refreshToken: refreshToken ? encrypt(refreshToken) : null,
            username: profile.username,
            avatarUrl: profile.photos?.[0]?.value,
            providerId: profile.id.toString(),
            scope: "user:email,repo",
          },
          create: {
            userId,
            provider: "github",
            providerId: profile.id.toString(),
            accessToken: encrypt(accessToken),
            refreshToken: refreshToken ? encrypt(refreshToken) : null,
            username: profile.username,
            avatarUrl: profile.photos?.[0]?.value,
            scope: "user:email,repo",
          },
        });

        res.redirect(`${env.CLIENT_URL}/dashboard?github=connected`);
        return;
      }

      // ─── LOGIN FLOW ──────────────────────────────
      const email =
        profile.emails?.[0]?.value || `${profile.username}@github.local`;

      let user = await prisma.user.findUnique({
        where: {
          provider_providerId: {
            provider: "github",
            providerId: profile.id.toString(),
          },
        },
      });

      if (!user) {
        const existingUser = await prisma.user.findUnique({
          where: { email },
        });

        if (existingUser) {
          user = existingUser;
        } else {
          user = await prisma.user.create({
            data: {
              email,
              name: profile.displayName || profile.username,
              avatar: profile.photos?.[0]?.value,
              provider: "github",
              providerId: profile.id.toString(),
            },
          });
        }
      }

      const token = signToken({
        userId: user.id,
        email: user.email,
        role: user.role,
      });

      res.cookie("token", token, cookieOptions);
      res.redirect(`${env.CLIENT_URL}/dashboard`);
    } catch (error) {
      console.error("GitHub callback error:", error);
      res.redirect(`${env.CLIENT_URL}/login?error=github_auth_failed`);
    }
  }
);

// ── Get current user ───────────────────────────────────
router.get("/me", authenticate, async (req: Request, res: Response) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.userId },
      select: {
        id: true,
        email: true,
        name: true,
        avatar: true,
        role: true,
        provider: true,
        createdAt: true,
        connectedAccounts: {
          select: {
            id: true,
            provider: true,
            username: true,
            avatarUrl: true,
            createdAt: true,
          },
        },
      },
    });

    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    res.json({ user });
  } catch (error) {
    console.error("Get me error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ── Disconnect GitHub account ──────────────────────────
router.delete(
  "/github/disconnect",
  authenticate,
  async (req: Request, res: Response) => {
    try {
      await prisma.connectedAccount.deleteMany({
        where: {
          userId: req.user!.userId,
          provider: "github",
        },
      });

      res.json({ message: "GitHub account disconnected" });
    } catch (error) {
      console.error("Disconnect error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }
);

// ── Logout ─────────────────────────────────────────────
router.post("/logout", (_req: Request, res: Response) => {
  res.clearCookie("token", { path: "/" });
  res.json({ message: "Logged out successfully" });
});

export default router;
