"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { useSession } from "@/components/SessionProvider";
import { Button, Field, Notice, inputClass } from "@/components/ui/kit";
import { postJson } from "@/lib/fetchJson";
import { departments } from "@/lib/timesheet";

const emptyForm = { name: "", email: "", password: "", department: "" };

// Only ever send people to a page on this site after login.
function safeNextPath(value) {
  return value && value.startsWith("/") && !value.startsWith("//") ? value : "/dashboard";
}

export default function AuthForm({ mode }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { refresh } = useSession();
  const isRegister = mode === "register";
  const [form, setForm] = useState(emptyForm);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  function updateField(name, value) {
    setError("");
    setSuccess("");
    setForm((current) => ({ ...current, [name]: value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setLoading(true);
    setError("");

    try {
      if (isRegister) {
        const data = await postJson("/api/auth/register", form);
        setSuccess(data.message);
        setForm(emptyForm);
        return;
      }

      await postJson("/api/auth/login", { email: form.email, password: form.password });
      await refresh();
      router.push(safeNextPath(searchParams.get("next")));
      router.refresh();
    } catch (authError) {
      setError(authError.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-4" noValidate>
      {isRegister ? (
        <>
          <Field label="Full name" required>
            <input
              value={form.name}
              onChange={(event) => updateField("name", event.target.value)}
              className={inputClass}
              placeholder="Your name"
              type="text"
              autoComplete="name"
              required
            />
          </Field>

          <Field label="Department" required hint="Only the admin can change this later.">
            <select
              value={form.department}
              onChange={(event) => updateField("department", event.target.value)}
              className={inputClass}
              required
            >
              <option value="">Select your department</option>
              {departments.map((department) => (
                <option key={department} value={department}>
                  {department}
                </option>
              ))}
            </select>
          </Field>
        </>
      ) : null}

      <Field label="Email" required>
        <input
          value={form.email}
          onChange={(event) => updateField("email", event.target.value)}
          className={inputClass}
          placeholder="you@example.com"
          type="email"
          autoComplete="email"
          required
        />
      </Field>

      <Field label="Password" required hint={isRegister ? "At least 6 characters." : undefined}>
        <div className="relative">
          <input
            value={form.password}
            onChange={(event) => updateField("password", event.target.value)}
            className={`${inputClass} pr-16`}
            type={showPassword ? "text" : "password"}
            autoComplete={isRegister ? "new-password" : "current-password"}
            required
          />
          <button
            type="button"
            onClick={() => setShowPassword((current) => !current)}
            className="absolute inset-y-0 right-2 my-auto h-7 rounded px-2 text-xs font-medium text-primary/55 hover:text-primary"
          >
            {showPassword ? "Hide" : "Show"}
          </button>
        </div>
      </Field>

      <Notice tone="error">{error}</Notice>
      <Notice tone="success">{success}</Notice>

      <Button disabled={loading} type="submit" size="lg" className="mt-1 w-full">
        {loading ? "Please wait…" : isRegister ? "Create account" : "Log in"}
      </Button>

      <p className="text-center text-sm text-primary/60">
        {isRegister ? "Already registered?" : "New here?"}{" "}
        <Link
          href={isRegister ? "/login" : "/register"}
          className="font-semibold text-secondary hover:text-primary"
        >
          {isRegister ? "Log in" : "Create an account"}
        </Link>
      </p>
    </form>
  );
}
