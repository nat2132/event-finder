import { zodResolver } from "@hookform/resolvers/zod"
import { ArrowRight, Check, Loader2 } from "lucide-react"
import { useState } from "react"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { useSignUp } from "@clerk/clerk-react";
import { AuthLayout } from "@/components/auth/auth-layout"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"


const signUpSchema = z.object({
  name: z.string().min(2, {
    message: "Name must be at least 2 characters.",
  }),
  email: z.string().email({
    message: "Please enter a valid email address.",
  }),
  password: z.string().min(8, {
    message: "Password must be at least 8 characters.",
  }),
  terms: z.boolean().refine((val) => val === true, {
    message: "You must agree to the terms and conditions.",
  }),
  code: z.string().optional(),
})

type SignUpValues = z.infer<typeof signUpSchema>

import { useNavigate } from "react-router-dom";

export default function SignUpPage() {
  const [isLoading, setIsLoading] = useState(false)
  const [success, setSuccess] = useState(false)

  const form = useForm<SignUpValues>({
    resolver: zodResolver(signUpSchema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
      terms: false,
      code: "",
    },
  })

  const { signUp, isLoaded } = useSignUp();
  const [error, setError] = useState<string | null>(null);
  const [pendingVerification, setPendingVerification] = useState(false);
  const navigate = useNavigate();

  async function onSubmit(data: SignUpValues) {
    setIsLoading(true);
    setError(null);
    if (!isLoaded) {
      setIsLoading(false);
      setError("Auth service not loaded. Please try again.");
      return;
    }
    try {
      // Split full name into first and last
      function splitName(fullName: string) {
        const [firstName, ...rest] = fullName.trim().split(' ');
        return {
          firstName,
          lastName: rest.join(' ') || '',
        };
      }
      const { firstName, lastName } = splitName(data.name);
      const result = await signUp.create({
        emailAddress: data.email,
        password: data.password,
        firstName,
        lastName,
      });
      if (result.status === "complete") {
        setIsLoading(false);
        setSuccess(true);
        navigate("/dashboard/user/discover");

      } else if (result.status === "missing_requirements" || result.status === "abandoned") {
        // Send email verification
        await signUp.prepareEmailAddressVerification({ strategy: "email_code" });
        setPendingVerification(true);
        setIsLoading(false);
      } else {
        setError("Unexpected registration status. Please try again.");
        setIsLoading(false);
      }
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message || "Sign up failed. Please check your details.");
      } else {
        setError("An unknown error occurred. Please try again.");
      }
      setIsLoading(false);
    }
  }

  // Social signup handlers
  async function handleOAuth(provider: "google" | "facebook") {
    setIsLoading(true);
    setError(null);
    if (!isLoaded) {
      setIsLoading(false);
      setError("Auth service not loaded. Please try again.");
      return;
    }
    try {
      await signUp.authenticateWithRedirect({
        strategy: `oauth_${provider}`,
        redirectUrl: window.location.origin + "/sign-in",
        redirectUrlComplete: window.location.origin + "/dashboard/user/discover",
      });
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message || `Sign up with ${provider} failed.`);
      } else {
        setError("An unknown error occurred. Please try again.");
      }
      setIsLoading(false);
    }
  }

  if (success) {
    return (
      <AuthLayout title="Account created!" description="Your account has been created successfully." showRightSide={false}>
        <div className="animate-in flex flex-col items-center justify-center min-h-[400px] space-y-6 text-center">
          <div className="rounded-full bg-green-100 p-4">
            <Check className="h-10 w-10 text-green-600" />
          </div>
          <div className="space-y-2">
            <h3 className="text-2xl font-semibold">Welcome to Eventify!</h3>
            <p className="text-muted-foreground">Your account has been created successfully. Please check your email for verification.</p>
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

  if (pendingVerification) {
    return (
      <AuthLayout title="Verify your email" description="Please enter the verification code sent to your email" showRightSide={false}>
        <div className="animate-in flex flex-col items-center justify-center min-h-[400px] space-y-6 text-center">
          <div className="rounded-full bg-blue-100 p-4">
            <Loader2 className="h-10 w-10 text-blue-600 animate-spin" />
          </div>
          <div className="space-y-2">
            <h3 className="text-2xl font-semibold">Check your email</h3>
            <p className="text-muted-foreground">We've sent a verification code to your email address.</p>
          </div>
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(async (data) => {
                setIsLoading(true);
                setError(null);
                try {
                  if (!signUp) {
                    setError("Auth service not loaded. Please try again.");
                    setIsLoading(false);
                    return;
                  }
                  const result = await signUp.attemptEmailAddressVerification({
                    code: data.code || "",
                  });
                  if (result.status === "complete") {
                    setSuccess(true);
                  } else {
                    setError("Verification failed. Please try again.");
                  }
                  setIsLoading(false);
                } catch (err: unknown) {
                  if (err instanceof Error) {
                    setError(err.message || "Verification failed. Please try again.");
                  } else {
                    setError("An unknown error occurred. Please try again.");
                  }
                  setIsLoading(false);
                }
              })}
              className="w-full max-w-sm space-y-4"
            >
              <FormField
                control={form.control}
                name="code"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <Input 
                        placeholder="Enter verification code" 
                        {...field} 
                        className=" text-center text-lg tracking-widest"
                        maxLength={6}
                      />
                    </FormControl>
                    <FormMessage className="text-red-500" />
                  </FormItem>
                )}
              />
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Verifying...
                  </>
                ) : (
                  "Verify Email"
                )}
              </Button>
              {error && <div className="text-red-500 text-sm mt-2">{error}</div>}
              <Button
                type="button"
                variant="ghost"
                className="w-full text-sm"
                onClick={async () => {
                  setIsLoading(true);
                  try {
                    if (!signUp) {
                      throw new Error("Auth service not loaded");
                    }
                    await signUp.prepareEmailAddressVerification({ strategy: "email_code" });
                    setError(null);
                  } catch (error) {
                    setError("Failed to resend code. Please try again.");
                  }
                  setIsLoading(false);
                }}
                disabled={isLoading}
              >
                Didn't receive the code? Resend
              </Button>
            </form>
          </Form>
        </div>
      </AuthLayout>
    )
  }

  return (
    <AuthLayout title="Create an account" description="Enter your information to create an account" showRightSide={!pendingVerification}>
      <div className="animate-in">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Full Name</FormLabel>
                  <FormControl>
                    <Input placeholder="John Doe" {...field} />
                  </FormControl>
                  <FormMessage className="text-red-500" />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input placeholder="john@example.com" type="email" {...field} />
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
                  <FormLabel>Password</FormLabel>
                  <FormControl>
                    <Input placeholder="••••••••" type="password" {...field} />
                  </FormControl>
                  <FormDescription>Must be at least 8 characters long</FormDescription>
                  <FormMessage className="text-red-500" />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="terms"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                  <FormControl>
                    <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel>
                      I agree to the{" "}
                      <a href="/terms" className="text-primary underline hover:text-primary/90">
                        terms of service
                      </a>{" "}
                      and{" "}
                      <a href="/privacy" className="text-primary underline hover:text-primary/90">
                        privacy policy
                      </a>
                    </FormLabel>
                    <FormMessage className="text-red-500" />
                  </div>
                </FormItem>
              )}
            />
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating account...
                </>
              ) : (
                "Sign up"
              )}
            </Button>
            {error && <div className="text-red-500 text-sm mt-2">{error}</div>}
          </form>
        </Form>

        <div className="mt-6">
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <Separator className="w-full bg-gray-300 h-px" />
            </div>
            <div className="relative z-10 flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">Or continue with</span>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-2">
            <Button variant="outline" className="w-full" onClick={() => handleOAuth("google")} disabled={isLoading}>
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
            <Button variant="outline" className="w-full" onClick={() => handleOAuth("facebook")} disabled={isLoading}>
              <svg className="mr-2 h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M22 12c0-5.523-4.477-10-10-10S2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.878v-6.987h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.988C18.343 21.128 22 16.991 22 12z" />
              </svg>
              Facebook
            </Button>
          </div>
        </div>

        <div className="mt-6 text-center text-sm">
          Already have an account?{" "}
          <a href="/sign-in" className="text-primary underline hover:text-primary/90">
            Sign in
          </a>
        </div>
      </div>
    </AuthLayout>
  )
}
