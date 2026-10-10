import { Suspense } from "react";
import AuthForm from "@/components/AuthForm";
import AuthShell from "@/components/AuthShell";

export const metadata = { title: "Create account | Mruda Eco Village" };

export default function RegisterPage() {
  return (
    <AuthShell
      title="Create your account"
      subtitle="After you register, the admin approves your account. Then you can log in."
    >
      <Suspense fallback={<p className="text-center text-sm text-primary/55">Loading…</p>}>
        <AuthForm mode="register" />
      </Suspense>
    </AuthShell>
  );
}
