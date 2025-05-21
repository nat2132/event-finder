import { useState } from "react"
import { format } from "date-fns"
import { motion, AnimatePresence } from "framer-motion"
import { Edit, MessageSquare, Star, Trash2} from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Badge } from "@/components/ui/badge"

interface ReviewCardProps {
  review: Review
  eventName: string
  onRespond: (reviewId: string, response: string) => void
  onEditResponse: (reviewId: string, responseId: string, newContent: string) => void
  onDeleteResponse: (reviewId: string, responseId: string) => void
}

export function ReviewCard({ review, eventName, onRespond, onEditResponse, onDeleteResponse }: ReviewCardProps) {
  const [isResponding, setIsResponding] = useState(false)
  const [responseText, setResponseText] = useState("")
  const [editingResponseId, setEditingResponseId] = useState<string | null>(null)
  const [editText, setEditText] = useState("")

  const handleSubmitResponse = () => {
    if (responseText.trim()) {
      onRespond(review.id, responseText)
      setResponseText("")
      setIsResponding(false)
    }
  }

  const handleStartEditing = (responseId: string, currentContent: string) => {
    setEditingResponseId(responseId)
    setEditText(currentContent)
  }

  const handleSaveEdit = (responseId: string) => {
    if (editText.trim()) {
      onEditResponse(review.id, responseId, editText)
      setEditingResponseId(null)
      setEditText("")
    }
  }

  const handleCancelEdit = () => {
    setEditingResponseId(null)
    setEditText("")
  }

  return (
    <Card className="overflow-hidden transition-all hover:shadow-md">
      <CardHeader className="bg-muted/30 pb-4">
        <div className="flex justify-between items-start">
          <div className="flex items-center gap-3">
            <Avatar>
              <AvatarFallback>{String((typeof review.userName === 'string' ? review.userName : (review.userName && review.userName.name) || 'U')).charAt(0)}</AvatarFallback>
              <AvatarImage src={typeof review.userName === 'object' && review.userName.avatar ? review.userName.avatar : (review.userAvatar || "/placeholder.svg")} alt={typeof review.userName === 'object' ? review.userName.name : review.userName} />
            </Avatar>
            <div>
              <div className="font-medium">{typeof review.userName === 'object' ? review.userName.name : review.userName}</div>
              <div className="text-sm text-muted-foreground">
                {(() => {
                  try {
                    return review.createdAt ? (
                      <span>
                        {format(new Date(review.createdAt), "MMM d, yyyy")}
                        {review.createdAt !== review.updatedAt && " (edited)"}
                      </span>
                    ) : "Unknown date";
                  } catch {
                    return "Unknown date";
                  }
                })()}
              </div>
            </div>
          </div>
          <div className="flex flex-col items-end gap-1">
            <div className="flex items-center">
              {Array.from({ length: 5 }).map((_, i) => (
                <Star
                  key={i}
                  className={`h-4 w-4 ${i < review.rating ? "fill-yellow-400 text-yellow-400" : "text-muted"}`}
                />
              ))}
            </div>
            <Badge variant="outline" className="text-xs">
              {eventName}
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-4">
        <p className="mb-4">{review.comment}</p>

        {/* Responses section */}
        {review.responses && review.responses.length > 0 && (
          <div className="mt-6 space-y-4">
            <h4 className="text-sm font-medium flex items-center gap-1">
              <MessageSquare className="h-4 w-4" />
              Organizer Responses
            </h4>
            <div className="pl-4 border-l-2 space-y-4">
              <AnimatePresence>
                {review.responses.map((response) => (
                  <motion.div
                    key={response.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="bg-muted/30 p-3 rounded-md"
                  >
                    {editingResponseId === response.id ? (
                      <div className="space-y-2">
                        <Textarea
                          value={editText}
                          onChange={(e) => setEditText(e.target.value)}
                          className="min-h-[80px]"
                        />
                        <div className="flex justify-end gap-2">
                          <Button size="sm" variant="outline" onClick={handleCancelEdit}>
                            Cancel
                          </Button>
                          <Button size="sm" onClick={() => handleSaveEdit(response.id)}>
                            Save
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="flex justify-between items-start mb-2">
                          <div className="flex items-center gap-2">
                            <Avatar className="h-7 w-7">
                              <AvatarFallback>{(response.organizerName || 'O').charAt(0)}</AvatarFallback>
                              {response.organizerImage && (
                                <AvatarImage src={response.organizerImage} alt={response.organizerName || 'Organizer'} />
                              )}
                            </Avatar>
                            <span className="text-sm font-medium">{response.organizerName}</span>
                            <Badge className="ml-1 px-2 py-0.5 text-xs" variant="secondary">Organizer</Badge>
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {format(new Date(response.createdAt), "MMM d, yyyy")}
                            {response.createdAt !== response.updatedAt && " (edited)"}
                          </div>
                        </div>
                        <p className="text-sm">{response.content}</p>
                        <div className="flex justify-end gap-2 mt-2">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 px-2"
                            onClick={() => handleStartEditing(response.id, response.content)}
                          >
                            <Edit className="h-3.5 w-3.5 mr-1" />
                            Edit
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button size="sm" variant="ghost" className="h-8 px-2 text-destructive">
                                <Trash2 className="h-3.5 w-3.5 mr-1" />
                                Delete
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete Response</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure you want to delete this response? This action cannot be undone.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => onDeleteResponse(review.id, response.id)}
                                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                >
                                  Delete
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </>
                    )}
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </div>
        )}
      </CardContent>
      <CardFooter className="flex justify-end border-t pt-4">
        {isResponding ? (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="w-full space-y-2"
          >
            <Textarea
              placeholder="Write your response..."
              value={responseText}
              onChange={(e) => setResponseText(e.target.value)}
              className="min-h-[100px]"
            />
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsResponding(false)}>
                Cancel
              </Button>
              <Button onClick={handleSubmitResponse}>Submit Response</Button>
            </div>
          </motion.div>
        ) : (
          <Button onClick={() => setIsResponding(true)}>
            <MessageSquare className="mr-2 h-4 w-4" />
            {review.responses && review.responses.length > 0 ? "Add Another Response" : "Respond"}
          </Button>
        )}
      </CardFooter>
    </Card>
  )
}
