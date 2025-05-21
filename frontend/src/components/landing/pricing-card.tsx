import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card"
import { CheckCircle2 } from "lucide-react"


interface PricingCardProps {
  title: string
  price: string
  period?: string
  description: string
  features: string[]
  buttonText: string
  buttonVariant?: "default" | "outline"
  popular?: boolean
}

export function PricingCard({
  title,
  price,
  period,
  description,
  features,
  buttonText,
  buttonVariant = "default",
  popular = false,
}: PricingCardProps) {
  return (
    <Card className={`relative transition-all ${popular ? "border-primary shadow-lg" : "hover:shadow-md"}`}>
      {popular && (
        <div className="absolute -top-3 left-0 right-0 mx-auto w-fit rounded-full bg-primary px-3 py-1 text-xs font-medium text-primary-foreground">
          Most Popular
        </div>
      )}
      <CardHeader className="text-center">
        <h3 className="text-xl font-bold">{title}</h3>
        <div className="mt-4 flex items-baseline justify-center">
          <span className="text-4xl font-bold">{price}</span>
          {period && <span className="ml-1 text-sm text-muted-foreground">/{period}</span>}
        </div>
        <p className="mt-2 text-sm text-muted-foreground">{description}</p>
      </CardHeader>
      <CardContent>
        <ul className="space-y-3">
          {features.map((feature, i) => (
            <li key={i} className="flex items-center">
              <CheckCircle2 className="mr-2 h-4 w-4 text-primary" />
              <span className="text-sm">{feature}</span>
            </li>
          ))}
        </ul>
      </CardContent>
      <CardFooter>
        <Button asChild variant={buttonVariant} className="w-full">
          <a href="/signup">{buttonText}</a>
        </Button>
      </CardFooter>
    </Card>
  )
}
