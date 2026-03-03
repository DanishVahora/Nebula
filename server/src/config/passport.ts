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
    },
    async (_accessToken, _refreshToken, profile, done) => {
      try {
        const email = profile.emails?.[0]?.value;
        if (!email) {
          return done(new Error("No email found in Google profile"));
        }

        // Find or create user
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
            // Email already taken by different auth provider
            return done(null, existingUser);
          }

          user = await prisma.user.create({
            data: {
              email,
              name: profile.displayName,
              avatar: profile.photos?.[0]?.value,
              provider: "google",
              providerId: profile.id,
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
