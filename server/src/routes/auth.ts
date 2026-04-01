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

// ── Check if email exists ──────────────────────────────
router.get("/check-email", async (req: Request, res: Response) => {
  try {
    const email = req.query.email as string;
    if (!email) {
      res.status(400).json({ error: "Email is required" });
      return;
    }

    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true, email: true, role: true, provider: true },
    });

    if (user) {
      res.json({ exists: true, role: user.role, provider: user.provider });
    } else {
      res.json({ exists: false });
    }
  } catch (error) {
    console.error("Check email error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ── Google OAuth ───────────────────────────────────────
// Accepts query params: mode=login|signup, role=STUDENT|TEACHER
router.get("/google", (req: Request, res: Response, next) => {
  const mode = req.query.mode as string || "login";
  const role = req.query.role as string || "STUDENT";
  
  // Store in session for callback
  (req as any).session = { authMode: mode, signupRole: role };
  
  passport.authenticate("google", { 
    session: false,
    state: JSON.stringify({ mode, role })
  })(req, res, next);
});

router.get(
  "/google/callback",
  (req: Request, res: Response, next) => {
    passport.authenticate("google", {
      session: false,
      failureRedirect: `${env.CLIENT_URL}/login?error=google_auth_failed`,
    }, (err: any, user: any, info: any) => {
      if (err) {
        console.error("Google auth error:", err);
        return res.redirect(`${env.CLIENT_URL}/login?error=google_auth_failed`);
      }
      
      if (!user) {
        // User not found during login - redirect to signup
        if (info?.message === "account_not_found") {
          return res.redirect(`${env.CLIENT_URL}/signup?error=account_not_found`);
        }
        return res.redirect(`${env.CLIENT_URL}/login?error=google_auth_failed`);
      }
      
      req.user = user;
      next();
    })(req, res, next);
  },
  async (req: Request, res: Response) => {
    try {
      const user = req.user as any;
      const stateParam = req.query.state as string;
      let mode = "login";
      let signupRole = "STUDENT";
      
      if (stateParam) {
        try {
          const state = JSON.parse(stateParam);
          mode = state.mode || "login";
          signupRole = state.role || "STUDENT";
        } catch {}
      }

      // If mode is signup, check for role conflicts
      if (mode === "signup" && user.role !== signupRole) {
        // Check if this is a new user (created recently) or existing
        const createdRecently = new Date(user.createdAt).getTime() > Date.now() - 60000;
        
        if (createdRecently) {
          // New user - apply the signup role
          await prisma.user.update({
            where: { id: user.id },
            data: { role: signupRole },
          });
          user.role = signupRole;
        } else {
          // Existing user trying to signup with different role
          res.redirect(`${env.CLIENT_URL}/login?error=role_conflict&existingRole=${user.role}`);
          return;
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
      console.error("Google callback error:", error);
      res.redirect(`${env.CLIENT_URL}/login?error=google_auth_failed`);
    }
  }
);

// ── GitHub OAuth (primary login) ───────────────────────
// Accepts query params: mode=login|signup, role=STUDENT|TEACHER
router.get("/github", (req: Request, res: Response, next) => {
  const mode = req.query.mode as string || "login";
  const role = req.query.role as string || "STUDENT";
  
  passport.authenticate("github", { 
    session: false,
    state: JSON.stringify({ mode, role })
  })(req, res, next);
});

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
      const stateParam = (req.query.state as string) || "";

      // ─── LINK FLOW ───────────────────────────────
      if (stateParam.startsWith("link_")) {
        const userId = stateParam.replace("link_", "");

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

      // ─── LOGIN/SIGNUP FLOW ──────────────────────────────
      let mode = "login";
      let signupRole = "STUDENT";
      
      if (stateParam) {
        try {
          const state = JSON.parse(stateParam);
          mode = state.mode || "login";
          signupRole = state.role || "STUDENT";
        } catch {}
      }

      const email =
        profile.emails?.[0]?.value || `${profile.username}@github.local`;

      // Check if user exists by GitHub provider ID
      let user = await prisma.user.findUnique({
        where: {
          provider_providerId: {
            provider: "github",
            providerId: profile.id.toString(),
          },
        },
      });

      // Check if email exists with different provider
      const userByEmail = await prisma.user.findUnique({
        where: { email },
      });

      if (!user && userByEmail) {
        // Email already registered with different auth provider
        if (mode === "signup") {
          // Check for role conflict: can't signup as different role
          if (signupRole !== userByEmail.role) {
            res.redirect(
              `${env.CLIENT_URL}/login?error=role_conflict&existingRole=${userByEmail.role}`
            );
            return;
          }
        }
        // Allow login with existing email account
        user = userByEmail;
      }

      if (!user) {
        // New user - only allow if in signup mode
        if (mode === "login") {
          res.redirect(`${env.CLIENT_URL}/signup?error=account_not_found`);
          return;
        }

        // Create new user with selected role
        user = await prisma.user.create({
          data: {
            email,
            name: profile.displayName || profile.username,
            avatar: profile.photos?.[0]?.value,
            provider: "github",
            providerId: profile.id.toString(),
            role: signupRole,
          },
        });
      } else if (mode === "signup") {
        // User exists - check if trying to change role
        if (signupRole !== user.role) {
          res.redirect(
            `${env.CLIENT_URL}/login?error=role_conflict&existingRole=${user.role}`
          );
          return;
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
