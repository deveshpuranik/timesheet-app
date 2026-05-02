import AuthForm from "@/components/AuthForm";
import BrandCard from "@/components/ui/BrandCard";
import { Suspense } from "react";

export default function LoginPage() {
  return (
    <AuthShell title="Welcome Back" subtitle="Login to manage Mruda Eco Village timesheets.">
      <Suspense fallback={<p className="text-sm text-primary/55">Loading login...</p>}>
        <AuthForm mode="login" />
      </Suspense>
    </AuthShell>
  );
}

function AuthShell({ title, subtitle, children }) {
  return (
    <section className="relative flex min-h-screen items-center justify-center overflow-hidden bg-linen px-6 py-32">
      <img
        src="/hero-mruda.jpeg"
        alt="Mruda Eco Village"
        className="absolute inset-0 h-full w-full object-cover"
      />
      <div className="absolute inset-0 bg-gradient-to-br from-primary/80 via-primary/40 to-secondary/20" />
      <BrandCard className="relative w-full max-w-md animate-scale p-8 sm:p-10">
        <img
          src="/logo.png"
          alt="Mruda Eco Village logo"
          className="mx-auto mb-7 h-20 w-20 rounded-full bg-white object-contain p-2 shadow-sm"
        />
        <h1 className="text-center font-serif text-4xl font-medium text-primary">{title}</h1>
        <p className="mb-8 mt-3 text-center text-sm font-light leading-7 text-primary/58">
          {subtitle}
        </p>
        {children}
      </BrandCard>
    </section>
  );
}
