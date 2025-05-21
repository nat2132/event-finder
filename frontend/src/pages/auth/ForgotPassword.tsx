import { zodResolver } from "@hookform/resolvers/zod"
import { ArrowLeft, Loader2, Mail } from "lucide-react"
import { useState } from "react"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { useSignIn } from "@clerk/clerk-react";

import { AuthLayout } from "@/components/auth/auth-layout"
import { Button } from "@/components/ui/button"
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"

const forgotPasswordSchema = z.object({
  email: z.string().email({
    message: "Please enter a valid email address.",
  }),
})

type ForgotPasswordValues = z.infer<typeof forgotPasswordSchema>

export default function ForgotPasswordPage() {
  const [isLoading, setIsLoading] = useState(false)
  const [success, setSuccess] = useState(false)

  const form = useForm<ForgotPasswordValues>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: {
      email: "",
    },
  })

  const { signIn, isLoaded } = useSignIn();
  const [error, setError] = useState<string | null>(null);
  const [email, setEmail] = useState<string>("");

  async function onSubmit(data: ForgotPasswordValues) {
    setIsLoading(true);
    setError(null);
    if (!isLoaded || !signIn) {
      setIsLoading(false);
      setError("Auth service not loaded. Please try again.");
      return;
    }
    try {
      const createdSignIn = await signIn.create({ identifier: data.email });
      const emailAddressId = createdSignIn?.supportedFirstFactors?.find(f => f.strategy === "reset_password_email_code")?.emailAddressId;
      if (!emailAddressId) {
        throw new Error("Could not find email address ID for password reset.");
      }
      await signIn.prepareFirstFactor({ strategy: "reset_password_email_code", emailAddressId });
      setEmail(data.email);
      setSuccess(true);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message || "Failed to send reset email. Please try again.");
      } else {
        setError("An unknown error occurred. Please try again.");
      }
    } finally {
      setIsLoading(false);
    }
  }

  async function resendEmail() {
    setIsLoading(true);
    setError(null);
    if (!isLoaded || !signIn) {
      setIsLoading(false);
      setError("Auth service not loaded. Please try again.");
      return;
    }
    try {
      const createdSignIn = await signIn.create({ identifier: email });
      const emailAddressId = createdSignIn?.supportedFirstFactors?.find(f => f.strategy === "reset_password_email_code")?.emailAddressId;
      if (!emailAddressId) {
        throw new Error("Could not find email address ID for password reset.");
      }
      await signIn.prepareFirstFactor({ strategy: "reset_password_email_code", emailAddressId });
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message || "Failed to resend reset email. Please try again.");
      } else {
        setError("An unknown error occurred. Please try again.");
      }
    } finally {
      setIsLoading(false);
    }
  }

  if (success) {
    return (
      <AuthLayout title="Check your email" description="We've sent you a password reset code">
        <div className="animate-in flex flex-col items-center justify-center space-y-6 text-center">
          <div className="rounded-full bg-blue-100 p-3">
            <Mail className="h-8 w-8 text-blue-600" />
          </div>
          <div className="space-y-2">
            <h3 className="text-xl font-medium">Check your inbox</h3>
            <p className="text-muted-foreground">
              We've sent a password reset code to <span className="font-medium">{email}</span>
            </p>
          </div>
          <div className="space-y-2">
            <Button asChild variant="outline" className="w-full">
              <a href="/sign-in">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to sign in
              </a>
            </Button>
            <Button
              className="w-full"
              onClick={resendEmail}
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Resending...
                </>
              ) : (
                "Resend email"
              )}
            </Button>
            {error && <div className="text-red-500 text-sm mt-2">{error}</div>}
          </div>
        </div>
      </AuthLayout>
    )
  }

  return (
    <AuthLayout title="Forgot password" description="Enter your email to reset your password">
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
                  <FormDescription>We'll send you a reset code to reset your password</FormDescription>
                  <FormMessage className="text-red-500" />
                </FormItem>
              )}
            />
            <Button
              type="submit"
              className="w-full text-primary-foreground bg-primary cursor-pointer hover:bg-gray-950"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Sending reset code...
                </>
              ) : (
                "Send reset code"
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
