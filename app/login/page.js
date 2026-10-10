import { Suspense } from "react";
import AuthForm from "@/components/AuthForm";
import AuthShell from "@/components/AuthShell";

export const metadata = { title: "Log in | Mruda Eco Village" };

export default function LoginPage() {
  return (
    <AuthShell title="Welcome back" subtitle="Log in to fill in your timesheet and request leave.">
      <Suspense fallback={<p className="text-center text-sm text-primary/55">Loading…</p>}>
        <AuthForm mode="login" />
      </Suspense>
    </AuthShell>
  );
}
