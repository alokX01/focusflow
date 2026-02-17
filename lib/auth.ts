import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import { MongoDBAdapter } from "@auth/mongodb-adapter";
import clientPromise from "./mongodb";
import { compare } from "bcryptjs";
import { getDatabase } from "./mongodb";

export const authOptions: NextAuthOptions = {
  // *********** MONGO ADAPTER ***********
  adapter: MongoDBAdapter(clientPromise) as any,

  // *********** PROVIDERS ***********
  providers: [
    // GOOGLE AUTH
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
      // Allow linking Google to an existing credentials account with same email
      allowDangerousEmailAccountLinking: true,
    }),

    // CREDENTIALS LOGIN
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

        const user = await db.collection("users").findOne({
          email,
        });

        if (!user || !user.hashedPassword) {
          throw new Error("Invalid credentials");
        }

        const valid = await compare(credentials.password, user.hashedPassword);
        if (!valid) throw new Error("Invalid credentials");

        return {
          id: user._id.toString(),
          email: user.email,
          name: user.name || "User",
          image: user.image || null,
        };
      },
    }),
  ],

  // *********** SESSION CONFIG ***********
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

  // *********** CALLBACKS ***********
  callbacks: {
    async jwt({ token, user }) {
      // Initial login
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
        (session.user as any).id = token.id; // REQUIRED for session tracking + analytics
      }
      return session;
    },

    async redirect({ url, baseUrl }) {
      if (url.startsWith("/")) return baseUrl + url;
      if (new URL(url).origin === baseUrl) return url;
      return baseUrl;
    },
  },

  // *********** EVENTS ***********
  events: {
    // When user signs in first time
    async signIn({ user, isNewUser }) {
      console.log(`✅ Sign-in: ${user.email}`);

      if (isNewUser) {
        try {
          const db = await getDatabase();
          const userId = String((user as any).id);
          await db.collection("userSettings").insertOne({
            userId,
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

          console.log(`🎉 Default settings created for ${user.email}`);
        } catch (e) {
          console.error("Error creating default settings:", e);
        }
      }
    },

    async signOut({ token }) {
      console.log(`👋 User signed out: ${token.email}`);
    },
  },

  debug: process.env.NEXTAUTH_DEBUG === "true",
  secret: process.env.NEXTAUTH_SECRET,
};

// *********** SESSION HELPER ***********
export async function getServerAuthSession() {
  const { getServerSession } = await import("next-auth/next");
  return getServerSession(authOptions);
}
