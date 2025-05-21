import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Calendar, Users, Ticket, Bell, Search, Map, MessageSquare, ArrowRight, ChevronRight } from "lucide-react"
import { EventCard } from "@/components/landing/event-card"
import { TestimonialCard } from "@/components/landing/testimonial-card"
import { PricingCard } from "@/components/landing/pricing-card"
import { FaqAccordion } from "@/components/landing/faq-accordion"
import { AnimatedGradient } from "@/components/landing/animated-gradient"
import { AnimatedCounter } from "@/components/landing/animated-counter"
import { HeroAnimation } from "@/components/landing/hero-animation"
import { ConnectingSteps } from "@/components/landing/connecting-steps"
import { Link } from "react-router-dom"
import { Spotlight } from "@/components/ui/spotlight"
import { CardStack } from "@/components/ui/card-stack"
import { useState, useEffect } from "react"
import { LoadingScreen } from "@/components/loading-screen"
import { ModeToggle } from "@/components/mode-toggle"

export default function LandingPage() {
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // Simulate loading time
    const timer = setTimeout(() => {
      setIsLoading(false)
    }, 2000)

    return () => clearTimeout(timer)
  }, [])

  if (isLoading) {
    return <LoadingScreen />
  }

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-50 w-full border-b  bg-[#ebedf2f2]/95 backdrop-blur supports-[backdrop-filter]:bg-[#ebedf2f2]/60 px-4 md:px-7">
        <div className="container flex h-16 items-center justify-between">
          <div className="flex items-center gap-2">
            <Ticket className="h-6 w-6 text-primary" />
            <span className="text-xl font-extrabold">Eventify</span>
          </div>
          <nav className="hidden md:flex items-center gap-6">
            <a href="#features" className="text-sm font-medium hover:text-primary transition-colors">
              Features
            </a>
            <a href="#how-it-works" className="text-sm font-medium hover:text-primary transition-colors">
              How It Works
            </a>
            <a href="#pricing" className="text-sm font-medium hover:text-primary transition-colors">
              Pricing
            </a>
            <a href="#testimonials" className="text-sm font-medium hover:text-primary transition-colors">
              Testimonials
            </a>
            <a href="#faq" className="text-sm font-medium hover:text-primary transition-colors">
              FAQ
            </a>
          </nav>
          <div className="flex items-center gap-4">
            <ModeToggle />
            <Link to="/login" className="text-sm font-medium hover:text-primary transition-colors hidden sm:inline-flex">
              Log in
            </Link>
            <Button variant="default" className="bg-primary text-primary-foreground">
              <Link to="/sign-up">Get Started</Link>
            </Button>
          </div>
        </div>
      </header>
      <main className="flex-1">
        <section className="relative overflow-hidden py-10 md:py-20">
          <AnimatedGradient />
          <div className="container relative z-10 px-4 md:px-6">
            <div className="grid gap-12 lg:grid-cols-2 lg:gap-8 items-center">
              <div className="flex flex-col gap-4">
                <div className="inline-flex items-center rounded-full border  px-3 py-1 text-sm">
                  <span className="font-medium">Discover, Attend, Create Events</span>
                  <ChevronRight className="ml-1 h-4 w-4" />
                </div>
                <h1 className="text-4xl text-primary font-bold tracking-tighter sm:text-5xl md:text-6xl">
                  Your Ultimate Event Discovery Platform
                </h1>
                <p className="text-muted-foreground text-lg md:text-xl max-w-[600px]">
                  Find local events, manage your schedule, and connect with like-minded people. All in one place, all at
                  your fingertips.
                </p>
                <div className="flex flex-col sm:flex-row gap-3 pt-4">
                  <div className="relative w-full sm:max-w-sm">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input type="text" placeholder="Search for events near you..." className="pl-10 pr-20 " />
                    <Button size="sm" className="absolute right-1 top-1/2 -translate-y-1/2">
                      <a href="/sign-up">
                      Search
                      </a>
                    </Button>
                  </div>
                  <Button asChild variant="outline" className="sm:w-auto ">
                    <a href="/sign-up">
                      Create Event
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </a>
                  </Button>
                </div>
                <div className="flex items-center gap-4 pt-4">
                <div className="flex -space-x-2">
                    {[1, 2, 3, 4].map((i) => (
                      <div key={i} className="h-8 w-8 rounded-full border-2 border-background overflow-hidden">
                        <img
                          src={`/person${i}.jpg`}
                          alt={`Person ${i}`}
                          width={32}
                          height={32}
                          className="h-full w-full object-cover"
                        />
                      </div>
                    ))}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    <AnimatedCounter value={5000} />+ people joined this month
                  </div>
                </div>
              </div>
              <div className="relative mx-auto lg:ml-auto">
                <HeroAnimation />
              </div>
            </div>
          </div>
        </section>

        <section className="py-20 bg-muted/50" id="features">
          <div className="container px-4 md:px-6">
            <div className="flex flex-col items-center justify-center text-center mb-12">
              <div className="inline-flex items-center rounded-full border bg-background px-3 py-1 text-sm mb-4">
                <span className="font-medium">Why Choose Eventify</span>
              </div>
              <h2 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl">
                Everything You Need for Events
              </h2>
              <p className="mt-4 text-muted-foreground text-lg max-w-[800px]">
                Discover powerful features designed to make event discovery and management seamless.
              </p>
            </div>
            <div className="flex justify-center items-center py-10">
              <CardStack
                items={[
                  {
                    id: 1,
                    name: "Smart Discovery",
                    designation: "AI-Powered",
                    content: (
                      <div className="flex flex-col gap-2">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                          <Search className="h-5 w-5" />
                        </div>
                        <p className="text-slate-900 dark:text-slate-100">Find events that match your interests with our AI-powered recommendation engine.</p>
                      </div>
                    ),
                  },
                  {
                    id: 2,
                    name: "Calendar Integration",
                    designation: "Stay Organized",
                    content: (
                      <div className="flex flex-col gap-2">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                          <Calendar className="h-5 w-5" />
                        </div>
                        <p className="text-slate-900 dark:text-slate-100">Sync with your favorite calendar apps to never miss an event again.</p>
                      </div>
                    ),
                  },
                  {
                    id: 3,
                    name: "Ticketing & RSVP",
                    designation: "Seamless Experience",
                    content: (
                      <div className="flex flex-col gap-2">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                          <Ticket className="h-5 w-5" />
                        </div>
                        <p className="text-slate-900 dark:text-slate-100">Seamless ticketing system for both free and paid events with QR code check-in.</p>
                      </div>
                    ),
                  },
                  {
                    id: 4,
                    name: "Event Reminders",
                    designation: "Never Miss Out",
                    content: (
                      <div className="flex flex-col gap-2">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                          <Bell className="h-5 w-5" />
                        </div>
                        <p className="text-slate-900 dark:text-slate-100">Get notified about upcoming events and important updates.</p>
                      </div>
                    ),
                  },
                  {
                    id: 5,
                    name: "Location Services",
                    designation: "Find Nearby Events",
                    content: (
                      <div className="flex flex-col gap-2">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                          <Map className="h-5 w-5" />
                        </div>
                        <p className="text-slate-900 dark:text-slate-100">Find events near you with interactive maps and directions.</p>
                      </div>
                    ),
                  },
                  {
                    id: 6,
                    name: "Community Building",
                    designation: "Connect & Network",
                    content: (
                      <div className="flex flex-col gap-2">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                          <Users className="h-5 w-5" />
                        </div>
                        <p className="text-slate-900 dark:text-slate-100">Connect with attendees, speakers, and organizers before, during, and after events.</p>
                      </div>
                    ),
                  },
                ]}
                offset={10}
                scaleFactor={0.06}
              />
            </div>
          </div>
        </section>

        <section className="py-20" id="how-it-works">
          <div className="container px-4 md:px-6">
            <div className="flex flex-col items-center justify-center text-center mb-12">
              <div className="inline-flex items-center rounded-full border bg-background  px-3 py-1 text-sm mb-4">
                <span className="font-medium">Simple Process</span>
              </div>
              <h2 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl">How Eventify Works</h2>
              <p className="mt-4 text-muted-foreground text-lg max-w-[800px]">
                From discovery to attendance, we've made the process simple and enjoyable.
              </p>
            </div>
            <div className="relative">
              <ConnectingSteps steps={3} className="mb-8" />
              <div className="grid gap-8 md:grid-cols-3 relative z-10">
                <div className="flex flex-col items-center text-center">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary text-primary-foreground mb-4 relative z-20">
                    <span className="text-xl font-bold">1</span>
                  </div>
                  <h3 className="text-xl font-bold mb-2">Discover Events</h3>
                  <p className="text-muted-foreground">
                    Browse through thousands of events or get personalized recommendations based on your interests.
                  </p>
                </div>
                <div className="flex flex-col items-center text-center">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary text-primary-foreground mb-4 relative z-20">
                    <span className="text-xl font-bold">2</span>
                  </div>
                  <h3 className="text-xl font-bold mb-2">Book Your Spot</h3>
                  <p className="text-muted-foreground">
                    Reserve your place with just a few clicks, whether it's a free or paid event.
                  </p>
                </div>
                <div className="flex flex-col items-center text-center">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary text-primary-foreground mb-4 relative z-20">
                    <span className="text-xl font-bold">3</span>
                  </div>
                  <h3 className="text-xl font-bold mb-2">Enjoy & Connect</h3>
                  <p className="text-muted-foreground">
                    Attend the event, meet new people, and build your network with our community features.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="py-20 bg-muted/50" id="events">
          <div className="container px-4 md:px-6">
            <div className="flex flex-col items-center justify-center text-center mb-12">
              <div className="inline-flex items-center rounded-full border bg-background px-3 py-1 text-sm mb-4">
                <span className="font-medium">Trending Now</span>
              </div>
              <h2 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl">Popular Events</h2>
              <p className="mt-4 text-muted-foreground text-lg max-w-[800px]">
                Discover what's happening around you and don't miss out on the fun.
              </p>
            </div>
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              <EventCard
                title="Tech Conference 2023"
                date="Oct 15-17, 2023"
                location="San Francisco, CA"
                image="./tech_conf.jpg"
                attendees={1240}
                category="Technology"
              />
              <EventCard
                title="Summer Music Festival"
                date="Aug 5-7, 2023"
                location="Austin, TX"
                image="./music_festival.jpg"
                attendees={5000}
                category="Music"
              />
              <EventCard
                title="Food & Wine Expo"
                date="Sep 22-24, 2023"
                location="Chicago, IL"
                image="/food_wine.jpg"
                attendees={3200}
                category="Food & Drink"
              />
            </div>
            <div className="flex justify-center mt-10">
              <Button asChild variant="outline" size="lg">
                <a href="/signup">
                  View All Events
                  <ArrowRight className="ml-2 h-4 w-4" />
                </a>
              </Button>
            </div>
          </div>
        </section>

        <section className="py-20" id="testimonials">
          <div className="container px-4 md:px-6">
            <div className="flex flex-col items-center justify-center text-center mb-12">
              <div className="inline-flex items-center rounded-full border bg-background px-3 py-1 text-sm mb-4">
                <span className="font-medium">What People Say</span>
              </div>
              <h2 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl">
                Loved by Attendees & Organizers
              </h2>
              <p className="mt-4 text-muted-foreground text-lg max-w-[800px]">
                Don't just take our word for it. Here's what our community has to say.
              </p>
            </div>
            <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
              <TestimonialCard
                quote="Eventify has completely changed how I discover local events. I've made so many new friends through the platform!"
                author="Sarah Johnson"
                role="Regular Attendee"
                avatar="/person1.jpg"
                rating={5}
              />
              <TestimonialCard
                quote="As an event organizer, the tools Eventify provides have made my job so much easier. The ticketing system is flawless."
                author="Michael Chen"
                role="Event Organizer"
                avatar="/person3.jpg"
                rating={5}
              />
              <TestimonialCard
                quote="I've discovered events I never would have found otherwise. The recommendation engine is spot on!"
                author="Jessica Williams"
                role="Music Enthusiast"
                avatar="/person2.jpg"
                rating={4}
              />
            </div>
          </div>
        </section>

        <section className="py-20 bg-muted/50" id="pricing">
          <div className="container px-4 md:px-6">
            <div className="flex flex-col items-center justify-center text-center mb-12">
              <div className="inline-flex items-center rounded-full border bg-background px-3 py-1 text-sm mb-4">
                <span className="font-medium">Simple Pricing</span>
              </div>
              <h2 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl">Choose Your Plan</h2>
              <p className="mt-4 text-muted-foreground text-lg max-w-[800px]">
                Whether you're an attendee or an organizer, we have the perfect plan for you.
              </p>
            </div>
            <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
              <PricingCard
                title="Basic"
                price="Free"
                description="Perfect for casual event-goers"
                features={[
                  "Discover and attend events",
                  "Basic calendar integration",
                  "Event reminders",
                  "Limited event history",
                ]}
                buttonText="Get Started"
                buttonVariant="outline"
              />
              <PricingCard
                title="Pro"
                price="1399 birr"
                period="per month"
                description="For active event enthusiasts"
                features={[
                  "Everything in Basic",
                  "Advanced recommendations",
                  "Early access to popular events",
                  "Unlimited event history",
                  "Priority support",
                ]}
                buttonText="Subscribe Now"
                buttonVariant="default"
                popular={true}
              />
              <PricingCard
                title="Organizer"
                price="3999 birr"
                period="per month"
                description="For event creators and organizers"
                features={[
                  "Everything in Pro",
                  "Create unlimited events",
                  "Advanced analytics",
                  "Custom branding",
                  "Ticketing with 1% fee",
                  "24/7 support",
                ]}
                buttonText="Start Organizing"
                buttonVariant="outline"
              />
            </div>
          </div>
        </section>

        <section className="py-20" id="faq">
          <div className="container px-4 md:px-6">
            <div className="flex flex-col items-center justify-center text-center mb-12">
              <div className="inline-flex items-center rounded-full border bg-background px-3 py-1 text-sm mb-4">
                <span className="font-medium">Questions & Answers</span>
              </div>
              <h2 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl">
                Frequently Asked Questions
              </h2>
              <p className="mt-4 text-muted-foreground text-lg max-w-[800px]">
                Find answers to common questions about Eventify.
              </p>
            </div>
            <div className="mx-auto max-w-3xl">
              <FaqAccordion />
            </div>
          </div>
        </section>

        <section className="relative w-full py-20 bg-primary text-primary-foreground overflow-hidden">
        <Spotlight
          className="-top-40 left-0 md:left-60 md:-top-20"
          fill="white" // Color of the spotlight beam
        />
          <div className="container relative z-10 px-4 md:px-6">
            <div className="grid gap-8 lg:grid-cols-2 items-center">
              <div>
                <h2 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl">
                  Ready to Transform Your Event Experience?
                </h2>
                <p className="mt-4 text-primary-foreground/90 text-lg max-w-[600px]">
                  Join thousands of event enthusiasts and organizers on Eventify today. Your next memorable experience
                  is just a click away.
                </p>
                <div className="flex flex-col sm:flex-row gap-4 mt-8">
                  <Button asChild size="lg" variant="secondary">
                    <a href="/signup">Get Started for Free</a>
                  </Button>
                  <Button
                    asChild
                    size="lg"
                    variant="outline"
                    className="bg-transparent border-[0.5px] border-primary-foreground/20 hover:bg-primary-foreground/10"
                  >
                    <a href="/contact">Contact Sales</a>
                  </Button>
                </div>
              </div>
              <div className="relative mx-auto lg:ml-auto">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-4">
                    <div className="rounded-lg bg-primary-foreground/10 p-4 backdrop-blur">
                      <Users className="h-6 w-6 mb-2" />
                      <p className="text-2xl font-bold">
                        <AnimatedCounter value={10000} />+
                      </p>
                      <p className="text-sm text-primary-foreground/80">Active Users</p>
                    </div>
                    <div className="rounded-lg bg-primary-foreground/10 p-4 backdrop-blur">
                      <Map className="h-6 w-6 mb-2" />
                      <p className="text-2xl font-bold">
                        <AnimatedCounter value={50} />+
                      </p>
                      <p className="text-sm text-primary-foreground/80">Cities</p>
                    </div>
                  </div>
                  <div className="space-y-4 mt-8">
                    <div className="rounded-lg bg-primary-foreground/10 p-4 backdrop-blur">
                      <Calendar className="h-6 w-6 mb-2" />
                      <p className="text-2xl font-bold">
                        <AnimatedCounter value={5000} />+
                      </p>
                      <p className="text-sm text-primary-foreground/80">Events Monthly</p>
                    </div>
                    <div className="rounded-lg bg-primary-foreground/10 p-4 backdrop-blur">
                      <MessageSquare className="h-6 w-6 mb-2" />
                      <p className="text-2xl font-bold">
                        <AnimatedCounter value={98} />%
                      </p>
                      <p className="text-sm text-primary-foreground/80">Satisfaction Rate</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>
      <footer className="border-t bg-muted/50">
        <div className="container px-4 md:px-6 py-12">
          <div className="grid gap-8 lg:grid-cols-5">
            <div className="lg:col-span-2">
              <div className="flex items-center gap-2 mb-4">
                <Ticket className="h-6 w-6 text-primary" />
                <span className="text-xl font-bold">Eventify</span>
              </div>
              <p className="text-muted-foreground max-w-[400px]">
                Discover, attend, and create memorable events with Eventify. Your ultimate platform for event discovery
                and management.
              </p>
              <div className="flex gap-4 mt-6">
                <a href="#" className="text-muted-foreground hover:text-foreground transition-colors">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="h-5 w-5"
                  >
                    <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"></path>
                  </svg>
                  <span className="sr-only">Facebook</span>
                </a>
                <a href="#" className="text-muted-foreground hover:text-foreground transition-colors">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="h-5 w-5"
                  >
                    <path d="M22 4s-.7 2.1-2 3.4c1.6 10-9.4 17.3-18 11.6 2.2.1 4.4-.6 6-2C3 15.5.5 9.6 3 5c2.2 2.6 5.6 4.1 9 4-.9-4.2 4-6.6 7-3.8 1.1 0 3-1.2 3-1.2z"></path>
                  </svg>
                  <span className="sr-only">Twitter</span>
                </a>
                <a href="#" className="text-muted-foreground hover:text-foreground transition-colors">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="h-5 w-5"
                  >
                    <rect width="20" height="20" x="2" y="2" rx="5" ry="5"></rect>
                    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path>
                    <line x1="17.5" x2="17.51" y1="6.5" y2="6.5"></line>
                  </svg>
                  <span className="sr-only">Instagram</span>
                </a>
              </div>
            </div>
            <div>
              <h3 className="text-sm font-medium mb-4">Product</h3>
              <ul className="space-y-3">
                <li>
                  <a
                    href="#features"
                    className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    Features
                  </a>
                </li>
                <li>
                  <a
                    href="#pricing"
                    className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    Pricing
                  </a>
                </li>
                <li>
                  <a href="#" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                    For Attendees
                  </a>
                </li>
                <li>
                  <a href="#" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                    For Organizers
                  </a>
                </li>
              </ul>
            </div>
            <div>
              <h3 className="text-sm font-medium mb-4">Company</h3>
              <ul className="space-y-3">
                <li>
                  <a href="#" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                    About Us
                  </a>
                </li>
                <li>
                  <a href="#" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                    Careers
                  </a>
                </li>
                <li>
                  <a href="#" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                    Blog
                  </a>
                </li>
                <li>
                  <a href="#" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                    Press
                  </a>
                </li>
              </ul>
            </div>
            <div>
              <h3 className="text-sm font-medium mb-4">Support</h3>
              <ul className="space-y-3">
                <li>
                  <a href="#" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                    Help Center
                  </a>
                </li>
                <li>
                  <a href="#" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                    Contact Us
                  </a>
                </li>
                <li>
                  <a href="#" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                    Privacy Policy
                  </a>
                </li>
                <li>
                  <a href="#" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                    Terms of Service
                  </a>
                </li>
              </ul>
            </div>
          </div>
          <div className="border-t  mt-12 pt-8 flex flex-col md:flex-row justify-between items-center">
            <p className="text-sm text-muted-foreground">© {new Date().getFullYear()} Eventify. All rights reserved.</p>
            <div className="flex gap-4 mt-4 md:mt-0">
              <a href="#" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                Privacy Policy
              </a>
              <a href="#" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                Terms of Service
              </a>
              <a href="#" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                Cookie Policy
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
