// app/auth/signin/page.tsx
import { Suspense } from "react";
import { SignInClient } from "./sign-in-client";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default function SignInPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          Loading…
        </div>
      }
    >
      <SignInClient />
    </Suspense>
  );
}
