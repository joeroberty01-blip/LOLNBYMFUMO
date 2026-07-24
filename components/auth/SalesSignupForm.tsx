"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { salesSignupSchema, type SalesSignupInput } from "@/lib/validators/auth";
import { signupSalesStaff } from "@/lib/actions/auth";

export function SalesSignupForm() {
  const router = useRouter();
  const [formError, setFormError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<SalesSignupInput>({ resolver: zodResolver(salesSignupSchema) });

  const onSubmit = handleSubmit(async (data) => {
    setFormError(null);
    const result = await signupSalesStaff(data);

    if (!result.success) {
      setFormError(result.error);
      return;
    }

    setDone(true);
  });

  if (done) {
    return (
      <div className="rounded-md border border-black/10 dark:border-white/15 p-4 text-sm">
        <p className="font-medium mb-1">Akaunti imeundwa!</p>
        <p className="text-black/70 dark:text-white/70">
          Akaunti yako inasubiri uthibitisho wa admin kabla hujaweza kuingia. Utaarifiwa (au
          jaribu ku-login baadaye) mara admin atakapokuidhinisha.
        </p>
        <button
          type="button"
          onClick={() => router.push("/login/sales-staff")}
          className="mt-3 rounded-md bg-foreground text-background px-4 py-2 text-sm font-medium"
        >
          Nenda kwenye Login
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      <div>
        <label htmlFor="name" className="block text-sm font-medium mb-1">
          Jina
        </label>
        <input
          id="name"
          type="text"
          autoComplete="name"
          className="w-full rounded-md border border-black/15 dark:border-white/20 bg-transparent px-3 py-2 text-sm"
          {...register("name")}
        />
        {errors.name && <p className="mt-1 text-sm text-red-600">{errors.name.message}</p>}
      </div>

      <div>
        <label htmlFor="email" className="block text-sm font-medium mb-1">
          Barua pepe
        </label>
        <input
          id="email"
          type="email"
          autoComplete="email"
          className="w-full rounded-md border border-black/15 dark:border-white/20 bg-transparent px-3 py-2 text-sm"
          {...register("email")}
        />
        {errors.email && <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>}
      </div>

      <div>
        <label htmlFor="password" className="block text-sm font-medium mb-1">
          Nywila
        </label>
        <input
          id="password"
          type="password"
          autoComplete="new-password"
          className="w-full rounded-md border border-black/15 dark:border-white/20 bg-transparent px-3 py-2 text-sm"
          {...register("password")}
        />
        {errors.password && (
          <p className="mt-1 text-sm text-red-600">{errors.password.message}</p>
        )}
      </div>

      <div>
        <label htmlFor="confirmPassword" className="block text-sm font-medium mb-1">
          Rudia Nywila
        </label>
        <input
          id="confirmPassword"
          type="password"
          autoComplete="new-password"
          className="w-full rounded-md border border-black/15 dark:border-white/20 bg-transparent px-3 py-2 text-sm"
          {...register("confirmPassword")}
        />
        {errors.confirmPassword && (
          <p className="mt-1 text-sm text-red-600">{errors.confirmPassword.message}</p>
        )}
      </div>

      {formError && <p className="text-sm text-red-600">{formError}</p>}

      <button
        type="submit"
        disabled={isSubmitting}
        className="rounded-md bg-foreground text-background px-4 py-2 text-sm font-medium disabled:opacity-50"
      >
        {isSubmitting ? "Inaunda akaunti..." : "Jisajili kama Sales Staff"}
      </button>
    </form>
  );
}
