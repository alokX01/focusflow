import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import { MongoDBAdapter } from "@auth/mongodb-adapter";
import { compare } from "bcryptjs";
import clientPromise, { getDatabase } from "./mongodb";

const isAuthDebug = process.env.NEXTAUTH_DEBUG === "true";

if (process.env.NODE_ENV === "production" && !process.env.NEXTAUTH_SECRET) {
  throw new Error(
    'Missing required environment variable: "NEXTAUTH_SECRET" for production'
  );
}

const googleClientId = process.env.GOOGLE_CLIENT_ID;
const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET;
const hasGoogleProvider = Boolean(googleClientId && googleClientSecret);

const providers: NextAuthOptions["providers"] = [
  CredentialsProvider({
    name: "Credentials",
    credentials: {
      email: { label: "Email", type: "email" },
      password: { label: "Password", type: "password" },
    },
    async authorize(credentials) {
      if (!credentials?.email || !credentials?.password) {
        throw new Error("Missing credentials");
      }

      const db = await getDatabase();
      const email = credentials.email.toLowerCase().trim();
      const user = await db.collection("users").findOne({ email });

      if (!user || !user.hashedPassword) {
        throw new Error("Invalid credentials");
      }

      const valid = await compare(credentials.password, user.hashedPassword);
      if (!valid) {
        throw new Error("Invalid credentials");
      }

      return {
        id: user._id.toString(),
        email: user.email,
        name: user.name || "User",
        image: user.image || null,
      };
    },
  }),
];

if (hasGoogleProvider) {
  providers.unshift(
    GoogleProvider({
      clientId: googleClientId!,
      clientSecret: googleClientSecret!,
      allowDangerousEmailAccountLinking: true,
    })
  );
} else if ((googleClientId || googleClientSecret) && isAuthDebug) {
  console.warn(
    "Google OAuth provider disabled because GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET are both required."
  );
}

export const authOptions: NextAuthOptions = {
  adapter: MongoDBAdapter(clientPromise) as any,
  providers,
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60,
    updateAge: 24 * 60 * 60,
  },
  jwt: {
    maxAge: 30 * 24 * 60 * 60,
  },
  pages: {
    signIn: "/auth/signin",
    newUser: "/dashboard",
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = (user as any).id;
        if ((user as any).email) token.email = (user as any).email;
        if ((user as any).name) token.name = (user as any).name;
        if ((user as any).image) token.picture = (user as any).image;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).id = token.id;
      }
      return session;
    },
    async redirect({ url, baseUrl }) {
      if (url.startsWith("/")) return baseUrl + url;
      if (new URL(url).origin === baseUrl) return url;
      return baseUrl;
    },
  },
  events: {
    async signIn({ user, isNewUser }) {
      if (isAuthDebug) {
        console.log(`Sign-in: ${user.email}`);
      }

      if (!isNewUser) return;

      const userId = String((user as any).id || "");
      if (!userId) return;

      try {
        const db = await getDatabase();
        await db.collection("userSettings").updateOne(
          { userId },
          {
            $setOnInsert: {
              userId,
              focusDuration: 25,
              shortBreakDuration: 5,
              longBreakDuration: 15,
              autoStartBreaks: false,
              autoStartPomodoros: false,
              cameraEnabled: false,
              distractionThreshold: 3,
              pauseOnDistraction: true,
              previewEnabled: true,
              overlayEnabled: true,
              mirrorVideo: true,
              minFocusConfidence: 35,
              focusGainPerSec: 1.2,
              defocusLossPerSec: 4.0,
              noFaceLossPerSec: 6.0,
              soundEnabled: true,
              desktopNotifications: true,
              breakReminders: true,
              eyeStrainReminders: true,
              dataRetention: 30,
              localProcessing: true,
              analyticsSharing: false,
              theme: "system",
              reducedMotion: false,
              pomodorosBeforeLongBreak: 4,
              createdAt: new Date(),
            },
            $set: {
              updatedAt: new Date(),
            },
          },
          { upsert: true }
        );
      } catch (error) {
        console.error("Failed to create default user settings:", error);
      }
    },
    async signOut({ token }) {
      if (isAuthDebug) {
        console.log(`Sign-out: ${token?.email ?? "unknown user"}`);
      }
    },
  },
  debug: isAuthDebug,
  secret: process.env.NEXTAUTH_SECRET,
};

export async function getServerAuthSession() {
  const { getServerSession } = await import("next-auth/next");
  return getServerSession(authOptions);
}
