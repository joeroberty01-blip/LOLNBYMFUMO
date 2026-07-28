"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { adminSignupSchema, type AdminSignupInput } from "@/lib/validators/auth";
import { signupAdmin } from "@/lib/actions/auth";
import { useTranslations } from "@/lib/i18n/I18nProvider";
import { Input, Label } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

export function AdminSignupForm() {
  const router = useRouter();
  const t = useTranslations();
  const [formError, setFormError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<AdminSignupInput>({ resolver: zodResolver(adminSignupSchema) });

  const onSubmit = handleSubmit(async (data) => {
    setFormError(null);
    const result = await signupAdmin(data);

    if (!result.success) {
      setFormError(result.error);
      return;
    }

    router.push("/login/admin?created=1");
  });

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      <div>
        <Label htmlFor="name">{t.common.name}</Label>
        <Input id="name" type="text" autoComplete="name" {...register("name")} />
        {errors.name && <p className="mt-1 text-sm text-danger">{errors.name.message}</p>}
      </div>

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
          autoComplete="new-password"
          {...register("password")}
        />
        {errors.password && <p className="mt-1 text-sm text-danger">{errors.password.message}</p>}
      </div>

      <div>
        <Label htmlFor="confirmPassword">{t.auth.confirmPassword}</Label>
        <Input
          id="confirmPassword"
          type="password"
          autoComplete="new-password"
          {...register("confirmPassword")}
        />
        {errors.confirmPassword && (
          <p className="mt-1 text-sm text-danger">{errors.confirmPassword.message}</p>
        )}
      </div>

      <div>
        <Label htmlFor="inviteSecret">Admin Invite Code</Label>
        <Input id="inviteSecret" type="password" {...register("inviteSecret")} />
        {errors.inviteSecret && (
          <p className="mt-1 text-sm text-danger">{errors.inviteSecret.message}</p>
        )}
      </div>

      {formError && <p className="text-sm text-danger">{formError}</p>}

      <Button type="submit" variant="primary" disabled={isSubmitting} className="w-full">
        {isSubmitting ? t.auth.creatingAccount : t.auth.adminSignupTitle}
      </Button>
    </form>
  );
}
