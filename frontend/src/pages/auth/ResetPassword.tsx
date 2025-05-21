import { zodResolver } from "@hookform/resolvers/zod"
import { ArrowRight, Loader2, ShieldCheck } from "lucide-react"
import { useState } from "react"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { useSignIn } from "@clerk/clerk-react";

import { AuthLayout } from "@/components/auth/auth-layout"
import { Button } from "@/components/ui/button"
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"

const resetPasswordSchema = z
  .object({
    email: z.string().email({ message: "Please enter a valid email address." }),
    code: z.string().min(1, { message: "Code is required." }),
    password: z.string().min(8, {
      message: "Password must be at least 8 characters.",
    }),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match.",
    path: ["confirmPassword"],
  })

type ResetPasswordValues = z.infer<typeof resetPasswordSchema>

export default function ResetPasswordPage() {
  const [isLoading, setIsLoading] = useState(false)
  const [success, setSuccess] = useState(false)

  const form = useForm<ResetPasswordValues>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      email: "",
      code: "",
      password: "",
      confirmPassword: "",
    },
  })

  const { signIn, isLoaded } = useSignIn();
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(data: ResetPasswordValues) {
    setIsLoading(true);
    setError(null);
    if (!isLoaded || !signIn) {
      setIsLoading(false);
      setError("Auth service not loaded. Please try again.");
      return;
    }
    try {
      // Step 1: create signIn with identifier
      const createdSignIn = await signIn.create({ identifier: data.email });
      const emailAddressId = createdSignIn?.supportedFirstFactors?.find(f => f.strategy === "reset_password_email_code")?.emailAddressId;
      if (!emailAddressId) {
        throw new Error("Could not find email address ID for password reset.");
      }
      // Step 2: attempt first factor with code and new password
      const result = await signIn.attemptFirstFactor({
        strategy: "reset_password_email_code",
        code: data.code,
        password: data.password,
      });
      if (result.status === "complete") {
        setSuccess(true);
      } else {
        setError("Could not reset password. Please try again.");
      }
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message || "Failed to reset password. Please try again.");
      } else {
        setError("An unknown error occurred. Please try again.");
      }
    } finally {
      setIsLoading(false);
    }
  }

  if (success) {
    return (
      <AuthLayout title="Password reset successful" description="Your password has been reset successfully" showRightSide={false}>
        <div className="animate-in flex flex-col items-center justify-center space-y-6 text-center">
          <div className="rounded-full bg-green-100 p-3">
            <ShieldCheck className="h-8 w-8 text-green-600" />
          </div>
          <div className="space-y-2">
            <h3 className="text-xl font-medium">Password reset complete</h3>
            <p className="text-muted-foreground">
              Your password has been reset successfully. You can now sign in with your new password.
            </p>
          </div>
          <Button asChild className="w-full">
            <a href="/sign-in">
              Continue to Sign In
              <ArrowRight className="ml-2 h-4 w-4" />
            </a>
          </Button>
        </div>
      </AuthLayout>
    )
  }

  return (
    <AuthLayout title="Reset password" description="Create a new password for your account" showRightSide={false}>
      <div className="animate-in">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input placeholder="john@example.com" type="email" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="code"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Reset Code</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter the code from your email" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>New Password</FormLabel>
                  <FormControl>
                    <Input placeholder="••••••••" type="password" {...field} />
                  </FormControl>
                  <FormDescription>Must be at least 8 characters long</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="confirmPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Confirm Password</FormLabel>
                  <FormControl>
                    <Input placeholder="••••••••" type="password" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Resetting...
                </>
              ) : (
                "Reset password"
              )}
            </Button>
            {error && <div className="text-red-500 text-sm mt-2">{error}</div>}
          </form>
        </Form>

        <div className="mt-6 text-center text-sm">
          Remember your password?{" "}
          <a href="/sign-in" className="text-primary underline hover:text-primary/90">
            Sign in
          </a>
        </div>
      </div>
    </AuthLayout>
  )
}
