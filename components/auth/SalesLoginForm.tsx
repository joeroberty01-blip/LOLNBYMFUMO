"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { signIn } from "next-auth/react";
import { salesLoginSchema, type SalesLoginInput } from "@/lib/validators/auth";

const ERROR_MESSAGES: Record<string, string> = {
  invalid_credentials: "Barua pepe au nywila si sahihi",
  pending_approval: "Akaunti yako inasubiri uthibitisho wa admin",
  not_approved: "Akaunti yako haijaidhinishwa kuingia. Wasiliana na admin.",
};

export function SalesLoginForm() {
  const router = useRouter();
  const [formError, setFormError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<SalesLoginInput>({ resolver: zodResolver(salesLoginSchema) });

  const onSubmit = handleSubmit(async (data) => {
    setFormError(null);
    const result = await signIn("sales-login", { ...data, redirect: false });

    if (result?.error) {
      setFormError(
        (result.code && ERROR_MESSAGES[result.code]) ?? "Imeshindikana kuingia. Jaribu tena."
      );
      return;
    }

    router.push("/dashboard/sales");
    router.refresh();
  });

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
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
          autoComplete="current-password"
          className="w-full rounded-md border border-black/15 dark:border-white/20 bg-transparent px-3 py-2 text-sm"
          {...register("password")}
        />
        {errors.password && (
          <p className="mt-1 text-sm text-red-600">{errors.password.message}</p>
        )}
      </div>

      {formError && <p className="text-sm text-red-600">{formError}</p>}

      <button
        type="submit"
        disabled={isSubmitting}
        className="rounded-md bg-foreground text-background px-4 py-2 text-sm font-medium disabled:opacity-50"
      >
        {isSubmitting ? "Inaingia..." : "Ingia kama Sales Staff"}
      </button>
    </form>
  );
}
