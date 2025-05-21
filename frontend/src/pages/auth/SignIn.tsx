import { zodResolver } from "@hookform/resolvers/zod"
import { Loader2 } from "lucide-react"
import { useState } from "react"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { useSignIn } from "@clerk/clerk-react";
import { useNavigate } from "react-router-dom";

import { AuthLayout } from "@/components/auth/auth-layout"
import { Button } from "@/components/ui/button"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"

const signInSchema = z.object({
  email: z.string().email({
    message: "Please enter a valid email address.",
  }),
  password: z.string().min(1, {
    message: "Password is required.",
  }),
})

type SignInValues = z.infer<typeof signInSchema>

import { useUser } from "@clerk/clerk-react";

export default function SignInPage() {
  const [isLoading, setIsLoading] = useState(false)

  const form = useForm<SignInValues>({
    resolver: zodResolver(signInSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  })

  const { signIn, isLoaded, setActive } = useSignIn();
  const { isSignedIn } = useUser();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  // Redirect if already signed in
  if (isSignedIn) {
    navigate("/dashboard/user/discover", { replace: true });
    return null;
  }

  async function onSubmit(data: SignInValues) {
    setIsLoading(true);
    setError(null);
    if (!isLoaded) {
      setIsLoading(false);
      setError("Auth service not loaded. Please try again.");
      return;
    }
    try {
      const result = await signIn.create({
        identifier: data.email,
        password: data.password,
      });
      if (result.status === "complete") {
        await setActive({ session: result.createdSessionId });
        navigate("/dashboard/user/discover"); // Redirect to user dashboard
      } else {
        setError("Unexpected authentication status. Please try again.");
      }
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message || "Sign in failed. Please check your credentials.");
      } else {
        setError("An unknown error occurred. Please try again.");
      }
    } finally {
      setIsLoading(false);
    }
  }

  // Social login handlers
  async function handleOAuth(provider: "google" | "facebook") {
    setIsLoading(true);
    setError(null);
    if (!isLoaded) {
      setIsLoading(false);
      setError("Auth service not loaded. Please try again.");
      return;
    }
    try {
      await signIn.authenticateWithRedirect({
        strategy: `oauth_${provider}`,
        redirectUrl: window.location.origin + "/sign-in",
        redirectUrlComplete: window.location.origin + "/landing",
      });
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message || `Sign in with ${provider} failed.`);
      } else {
        setError("An unknown error occurred. Please try again.");
      }
      setIsLoading(false);
    }
  }

  return (
    <AuthLayout title="Welcome back" description="Sign in to your account to continue" showRightSide={true}>
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
                    <Input placeholder="john@example.com" type="email" {...field}  />
                  </FormControl>
                  <FormMessage className="text-red-500" />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <div className="flex items-center justify-between">
                    <FormLabel>Password</FormLabel>
                    <a href="/forgot-password" className="text-sm text-primary underline hover:text-primary/90">
                      Forgot password?
                    </a>
                  </div>
                  <FormControl>
                    <Input placeholder="••••••••" type="password" {...field}  />
                  </FormControl>
                  <FormMessage className="text-red-500" />
                </FormItem>
              )}
            />
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Signing in...
                </>
              ) : (
                "Sign in"
              )}
            </Button>
            {error && <div className="text-red-500 text-sm mt-2">{error}</div>}
          </form>
        </Form>

        <div className="mt-6">
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <Separator className="w-full" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">Or continue with</span>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-2">
            <Button variant="outline" className="w-full" onClick={() => handleOAuth("google")}>
              <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
                <path
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  fill="#4285F4"
                />
                <path
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  fill="#34A853"
                />
                <path
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  fill="#FBBC05"
                />
                <path
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  fill="#EA4335"
                />
                <path d="M1 1h22v22H1z" fill="none" />
              </svg>
              Google
            </Button>
            <Button variant="outline" className="w-full" onClick={() => handleOAuth("facebook")}>
              <svg className="mr-2 h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M22 12c0-5.523-4.477-10-10-10S2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.878v-6.987h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.988C18.343 21.128 22 16.991 22 12z" />
              </svg>
              Facebook
            </Button>
          </div>
        </div>

        <div className="mt-6 text-center text-sm">
          Don't have an account?{" "}
          <a href="/sign-up" className="text-primary underline hover:text-primary/90">
            Sign up
          </a>
        </div>
      </div>
    </AuthLayout>
  )
}
