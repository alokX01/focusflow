import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import { MongoDBAdapter } from "@auth/mongodb-adapter";
import clientPromise from "./mongodb";
import { compare } from "bcryptjs";
import { getDatabase } from "./mongodb";

export const authOptions: NextAuthOptions = {
  adapter: MongoDBAdapter(clientPromise) as any,

  providers: [
    // Google OAuth
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
      authorization: {
        params: {
          prompt: "consent",
          access_type: "offline",
          response_type: "code",
        },
      },
    }),

    // Credentials (Email/Password)
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error("Invalid credentials");
        }

        try {
          const db = await getDatabase();
          const user = await db.collection("users").findOne({
            email: credentials.email,
          });

          if (!user || !user.hashedPassword) {
            throw new Error("Invalid credentials");
          }

          const isPasswordValid = await compare(
            credentials.password,
            user.hashedPassword
          );

          if (!isPasswordValid) {
            throw new Error("Invalid credentials");
          }

          return {
            id: user._id.toString(),
            email: user.email,
            name: user.name,
            image: user.image,
          };
        } catch (error) {
          console.error("Auth error:", error);
          return null;
        }
      },
    }),
  ],

  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },

  pages: {
    signIn: "/auth/signin",
    signOut: "/auth/signout",
    error: "/auth/error",
    newUser: "/auth/signup",
  },

  callbacks: {
    async jwt({ token, user, account }) {
      // Initial sign in
      if (account && user) {
        return {
          ...token,
          id: user.id,
          provider: account.provider,
        };
      }

      return token;
    },

    async session({ session, token }) {
      if (session.user) {
        // Attach the id to the session user without changing the declared Session type
        (session.user as any).id = token.id as string;
      }

      return session;
    },

    async redirect({ url, baseUrl }) {
      // Allows relative callback URLs
      if (url.startsWith("/")) return `${baseUrl}${url}`;
      // Allows callback URLs on the same origin
      else if (new URL(url).origin === baseUrl) return url;

      return baseUrl;
    },
  },

  events: {
    async signIn({ user, account, isNewUser }) {
      console.log(`✅ User signed in: ${user.email} via ${account?.provider}`);

      // Create default settings for new users
      if (isNewUser) {
        try {
          const db = await getDatabase();
          await db.collection("userSettings").insertOne({
            userId: user.id || user.email,
            focusDuration: 25,
            shortBreakDuration: 5,
            longBreakDuration: 15,
            autoStartBreaks: false,
            autoStartPomodoros: false,
            cameraEnabled: false,
            distractionThreshold: 3,
            pauseOnDistraction: true,
            soundEnabled: true,
            desktopNotifications: true,
            breakReminders: true,
            eyeStrainReminders: true,
            dataRetention: 30,
            localProcessing: true,
            analyticsSharing: false,
            theme: "system",
            reducedMotion: false,
            createdAt: new Date(),
            updatedAt: new Date(),
          });

          console.log(`✅ Default settings created for ${user.email}`);
        } catch (error) {
          console.error("Failed to create default settings:", error);
        }
      }
    },

    async signOut({ token }) {
      console.log(`👋 User signed out: ${token.email}`);
    },
  },

  debug: process.env.NODE_ENV === "development",

  secret: process.env.NEXTAUTH_SECRET,
};

/**
 * Helper to get session server-side
 */
export async function getServerAuthSession() {
  const { getServerSession } = await import("next-auth/next");
  return await getServerSession(authOptions);
}
