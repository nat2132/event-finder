import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"

import { Button } from "@/components/ui/button"
import { Form, FormControl, FormField, FormItem, FormMessage } from "@/components/ui/form"
import { Textarea } from "@/components/ui/textarea"
import { StarRating } from "@/components/user/star-rating"

const commentSchema = z.object({
  text: z.string().min(3, "Comment must be at least 3 characters"),
  rating: z.number().min(1, "Please select a rating").max(5),
})

type CommentFormValues = z.infer<typeof commentSchema>

interface CommentFormProps {
  onSubmit: (values: CommentFormValues) => void
  isSubmitting?: boolean
}

export function CommentForm({ onSubmit, isSubmitting = false }: CommentFormProps) {
  const form = useForm<CommentFormValues>({
    resolver: zodResolver(commentSchema),
    defaultValues: {
      text: "",
      rating: 0,
    },
  })

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="rating"
          render={({ field }) => (
            <FormItem>
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">Your Rating:</span>
                <FormControl>
                  <StarRating rating={field.value} interactive onRatingChange={field.onChange} size="md" />
                </FormControl>
              </div>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="text"
          render={({ field }) => (
            <FormItem>
              <FormControl>
                <Textarea
                  placeholder="Share your thoughts about this event..."
                  className="min-h-[100px] resize-none"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button type="submit" disabled={isSubmitting} className="bg-primary text-primary-foreground">
          {isSubmitting ? "Submitting..." : "Post Comment"}
        </Button>
      </form>
    </Form>
  )
}
