import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"

export function FaqAccordion() {
  return (
    <Accordion type="single" collapsible className="w-full">
      <AccordionItem value="item-1">
        <AccordionTrigger>What is Eventify?</AccordionTrigger>
        <AccordionContent>
          Eventify is an all-in-one event discovery and management platform that helps you find local events, manage
          your schedule, and connect with like-minded people. Whether you're looking to attend events or organize them,
          Eventify provides all the tools you need.
        </AccordionContent>
      </AccordionItem>
      <AccordionItem value="item-2">
        <AccordionTrigger>How do I create an event?</AccordionTrigger>
        <AccordionContent>
          Creating an event on Eventify is simple. Sign up for an Organizer account, click on "Create Event" in your
          dashboard, fill in the event details including date, time, location, description, and ticket information,
          upload images, and publish your event. You can also manage registrations, send updates, and track attendance
          all from your dashboard.
        </AccordionContent>
      </AccordionItem>
      <AccordionItem value="item-3">
        <AccordionTrigger>Is Eventify free to use?</AccordionTrigger>
        <AccordionContent>
          Eventify offers a free Basic plan for event attendees that includes discovering and attending events, basic
          calendar integration, and event reminders. For more advanced features, we offer Pro and Organizer plans with
          additional benefits. Check out our Pricing section for more details.
        </AccordionContent>
      </AccordionItem>
      <AccordionItem value="item-4">
        <AccordionTrigger>How does the recommendation system work?</AccordionTrigger>
        <AccordionContent>
          Our AI-powered recommendation engine analyzes your interests, past events you've attended, events you've
          saved, and your location to suggest events that match your preferences. The more you use Eventify, the better
          our recommendations become as the system learns your preferences over time.
        </AccordionContent>
      </AccordionItem>
      <AccordionItem value="item-5">
        <AccordionTrigger>Can I sell tickets through Eventify?</AccordionTrigger>
        <AccordionContent>
          Yes, with an Organizer plan, you can sell tickets directly through Eventify. We offer a secure payment
          processing system with just a 1% fee, which is lower than most competitors. You can create different ticket
          types, set prices, offer early bird discounts, and manage all your sales through your dashboard.
        </AccordionContent>
      </AccordionItem>
      <AccordionItem value="item-6">
        <AccordionTrigger>How do I contact support?</AccordionTrigger>
        <AccordionContent>
          For any questions or issues, you can reach our support team through the Help Center in your account, email us
          at support@eventify.com, or use the live chat feature on our website. Pro and Organizer plan members receive
          priority support with faster response times.
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  )
}
