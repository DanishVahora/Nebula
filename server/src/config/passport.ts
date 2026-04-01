import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import { Strategy as GitHubStrategy } from "passport-github2";
import { env } from "./env";
import prisma from "../lib/prisma";

// ── Google OAuth Strategy ──────────────────────────────
passport.use(
  new GoogleStrategy(
    {
      clientID: env.GOOGLE_CLIENT_ID,
      clientSecret: env.GOOGLE_CLIENT_SECRET,
      callbackURL: `http://localhost:${env.PORT}/api/auth/google/callback`,
      scope: ["profile", "email"],
      passReqToCallback: true,
    },
    async (req: any, _accessToken: string, _refreshToken: string, profile: any, done: any) => {
      try {
        const email = profile.emails?.[0]?.value;
        if (!email) {
          return done(new Error("No email found in Google profile"));
        }

        // Parse state to get mode and role
        let mode = "login";
        let signupRole = "STUDENT";
        const stateParam = req.query?.state;
        if (stateParam) {
          try {
            const state = JSON.parse(stateParam);
            mode = state.mode || "login";
            signupRole = state.role || "STUDENT";
          } catch {}
        }

        // Find user by provider
        let user = await prisma.user.findUnique({
          where: {
            provider_providerId: {
              provider: "google",
              providerId: profile.id,
            },
          },
        });

        if (!user) {
          // Check if email already exists with different provider
          const existingUser = await prisma.user.findUnique({
            where: { email },
          });

          if (existingUser) {
            // For login mode, use existing account
            // For signup mode, the callback will handle role conflict
            return done(null, existingUser);
          }

          // New user - only create if in signup mode
          if (mode === "login") {
            // Return null - callback will handle redirect to signup
            return done(null, false, { message: "account_not_found" });
          }

          // Create new user with selected role
          user = await prisma.user.create({
            data: {
              email,
              name: profile.displayName,
              avatar: profile.photos?.[0]?.value,
              provider: "google",
              providerId: profile.id,
              role: signupRole,
            },
          });
        }

        return done(null, user);
      } catch (error) {
        return done(error as Error);
      }
    }
  )
);

// ── GitHub OAuth Strategy (unified for login + linking) ──
// Uses a single callback URL to avoid GitHub's redirect_uri mismatch.
// The `state` parameter distinguishes login vs link flows.
passport.use(
  new GitHubStrategy(
    {
      clientID: env.GITHUB_CLIENT_ID,
      clientSecret: env.GITHUB_CLIENT_SECRET,
      callbackURL: `http://localhost:${env.PORT}/api/auth/github/callback`,
      scope: ["user:email", "repo"],
    },
    async (
      accessToken: string,
      refreshToken: string,
      profile: any,
      done: any
    ) => {
      try {
        // Pass raw data through — the route handler decides login vs link
        done(null, { accessToken, refreshToken, profile });
      } catch (error) {
        done(error as Error);
      }
    }
  )
);

passport.serializeUser((user: any, done) => {
  done(null, user);
});

passport.deserializeUser((user: any, done) => {
  done(null, user);
});

export default passport;
