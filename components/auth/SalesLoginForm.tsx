"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { signIn } from "next-auth/react";
import { salesLoginSchema, type SalesLoginInput } from "@/lib/validators/auth";
import { useTranslations } from "@/lib/i18n/I18nProvider";
import { Input, Label } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

export function SalesLoginForm() {
  const router = useRouter();
  const t = useTranslations();
  const [formError, setFormError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<SalesLoginInput>({ resolver: zodResolver(salesLoginSchema) });

  const errorMessages: Record<string, string> = {
    invalid_credentials: t.auth.invalidCredentials,
    pending_approval: t.auth.pendingApproval,
    not_approved: t.auth.notApproved,
  };

  const onSubmit = handleSubmit(async (data) => {
    setFormError(null);
    const result = await signIn("sales-login", { ...data, redirect: false });

    if (result?.error) {
      setFormError((result.code && errorMessages[result.code]) ?? t.auth.loginFailedGeneric);
      return;
    }

    router.push("/dashboard/sales");
    router.refresh();
  });

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      <div>
        <Label htmlFor="email">{t.common.email}</Label>
        <Input id="email" type="email" autoComplete="email" {...register("email")} />
        {errors.email && <p className="mt-1 text-sm text-danger">{errors.email.message}</p>}
      </div>

      <div>
        <Label htmlFor="password">{t.auth.password}</Label>
        <Input
          id="password"
          type="password"
          autoComplete="current-password"
          {...register("password")}
        />
        {errors.password && <p className="mt-1 text-sm text-danger">{errors.password.message}</p>}
      </div>

      {formError && <p className="text-sm text-danger">{formError}</p>}

      <Button type="submit" variant="primary" disabled={isSubmitting} className="w-full">
        {isSubmitting ? t.auth.signingIn : t.auth.loginAsSalesStaff}
      </Button>
    </form>
  );
}
