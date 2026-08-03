"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { z } from "zod";
import { updateUser } from "@/lib/actions/admin";
import { editUserSchema } from "@/lib/validators/auth";
import { Button } from "@/components/ui/Button";
import { Input, Label } from "@/components/ui/Input";

export function EditUserForm({
  userId,
  backHref,
  defaultValues,
}: {
  userId: string;
  backHref: string;
  defaultValues: { name: string; email: string };
}) {
  const router = useRouter();
  const [formError, setFormError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<z.input<typeof editUserSchema>, unknown, z.output<typeof editUserSchema>>({
    resolver: zodResolver(editUserSchema),
    defaultValues: { ...defaultValues, password: "", confirmPassword: "" },
  });

  const onSubmit = handleSubmit(async (data) => {
    setFormError(null);
    const result = await updateUser(userId, data);
    if (!result.success) {
      setFormError(result.error);
      return;
    }
    router.push(backHref);
    router.refresh();
  });

  return (
    <form onSubmit={onSubmit} className="flex max-w-sm flex-col gap-3">
      <div>
        <Label>Full Name</Label>
        <Input {...register("name")} />
        {errors.name && <p className="mt-1 text-sm text-danger">{errors.name.message}</p>}
      </div>
      <div>
        <Label>Email</Label>
        <Input type="email" {...register("email")} />
        {errors.email && <p className="mt-1 text-sm text-danger">{errors.email.message}</p>}
      </div>
      <div>
        <Label>New Password (optional)</Label>
        <Input type="password" {...register("password")} />
        {errors.password && <p className="mt-1 text-sm text-danger">{errors.password.message}</p>}
      </div>
      <div>
        <Label>Confirm New Password</Label>
        <Input type="password" {...register("confirmPassword")} />
        {errors.confirmPassword && (
          <p className="mt-1 text-sm text-danger">{errors.confirmPassword.message}</p>
        )}
      </div>

      {formError && <p className="text-sm text-danger">{formError}</p>}

      <div className="mt-2 flex justify-end gap-2">
        <Button type="button" variant="secondary" onClick={() => router.push(backHref)}>
          Cancel
        </Button>
        <Button type="submit" variant="primary" disabled={isSubmitting}>
          {isSubmitting ? "Saving..." : "Save"}
        </Button>
      </div>
    </form>
  );
}
