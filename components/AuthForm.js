"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import BrandButton from "@/components/ui/BrandButton";
import FormField from "@/components/ui/FormField";

const inputClass =
  "w-full border-b border-primary/10 bg-transparent px-0 py-4 text-sm text-primary outline-none transition focus:border-secondary";

export default function AuthForm({ mode }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextPath = searchParams.get("next") || "/dashboard";
  const isRegister = mode === "register";
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    role: "employee"
  });
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
      const payload = isRegister
        ? form
        : {
            email: form.email,
            password: form.password
          };

      const response = await fetch(`/api/auth/${isRegister ? "register" : "login"}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Authentication failed.");
      }

      if (isRegister) {
        setSuccess(data.message || "Your account is pending admin approval");
        setForm({ name: "", email: "", password: "", role: "employee" });
        return;
      }

      router.push(nextPath);
      router.refresh();
    } catch (authError) {
      setError(authError.message || "Authentication failed.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-7">
      {isRegister ? (
        <FormField label="Full Name">
          <input
            value={form.name}
            onChange={(event) => updateField("name", event.target.value)}
            className={inputClass}
            placeholder="Enter your name"
            type="text"
          />
        </FormField>
      ) : null}

      <FormField label="Email">
        <input
          value={form.email}
          onChange={(event) => updateField("email", event.target.value)}
          className={inputClass}
          placeholder="you@mrudaecovillage.com"
          type="email"
        />
      </FormField>

      <FormField label="Password">
        <input
          value={form.password}
          onChange={(event) => updateField("password", event.target.value)}
          className={inputClass}
          placeholder="Minimum 6 characters"
          type="password"
        />
      </FormField>

      {error ? (
        <p className="rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm font-medium text-red-800">
          {error}
        </p>
      ) : null}

      {success ? (
        <p className="rounded-2xl border border-secondary/30 bg-secondary/10 px-5 py-4 text-sm font-semibold text-primary">
          {success}
        </p>
      ) : null}

      <BrandButton disabled={loading} type="submit" className="w-full">
        {loading ? "Please wait" : isRegister ? "Create Account" : "Login"}
      </BrandButton>

      <p className="text-center text-sm font-light text-primary/58">
        {isRegister ? "Already registered?" : "Need an account?"}{" "}
        <Link
          href={isRegister ? "/login" : "/register"}
          className="font-semibold text-secondary transition hover:text-primary"
        >
          {isRegister ? "Login" : "Register"}
        </Link>
      </p>
    </form>
  );
}
