import { motion, AnimatePresence } from "framer-motion"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { StarRating } from "@/components/user/star-rating"
import type { Comment } from "@/components/user/comment-carousel"
import { cn } from "@/lib/utils"

interface CommentListProps {
  comments: Comment[]
  className?: string
  currentUserId?: string
  onEdit?: (comment: Comment) => void
  onDelete?: (comment: Comment) => void
  renderReply?: (comment: Comment) => React.ReactNode
}

import { useState } from "react";

export function CommentList({ comments, className, currentUserId, onEdit, onDelete, renderReply }: CommentListProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const [editRating, setEditRating] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const startEdit = (comment: Comment) => {
    setEditingId(comment.id);
    setEditText(comment.text);
    setEditRating(comment.rating);
    if (onEdit) onEdit(comment);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditText("");
    setEditRating(0);
  };

  const saveEdit = async () => {
    if (!editingId) return;
    setIsSubmitting(true);
    if (onEdit) {
      await onEdit({
        ...comments.find(c => c.id === editingId)!,
        text: editText,
        rating: editRating
      });
    }
    setEditingId(null);
    setIsSubmitting(false);
  };

  if (comments.length === 0) {
    return (
      <div className={cn("text-center py-8 text-muted-foreground", className)}>
        No comments yet. Be the first to comment!
      </div>
    )
  }

  return (
    <div className={cn("space-y-4", className)}>
      <AnimatePresence>
        {comments.map((comment: Comment) => (
          <motion.div
            key={comment.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
            className="border rounded-lg p-4"
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={comment.user.avatar || "/placeholder.svg"} alt={comment.user.name} />
                  <AvatarFallback>{comment.user?.name?.charAt?.(0) || "?"}</AvatarFallback>
                </Avatar>
                <div>
                  <div className="font-medium text-sm">{comment.user.name}</div>
                  <div className="text-xs text-muted-foreground">{comment.date}</div>
                </div>
              </div>
              <StarRating rating={comment.rating} size="sm" />
            </div>
            {editingId === comment.id ? (
              <div className="flex flex-col gap-2 mt-2">
                <textarea
                  className="border rounded p-2 text-sm"
                  value={editText}
                  onChange={e => setEditText(e.target.value)}
                  disabled={isSubmitting}
                />
                <input
                  type="number"
                  className="border rounded p-1 text-sm w-24"
                  value={editRating}
                  min={1}
                  max={5}
                  onChange={e => setEditRating(Number(e.target.value))}
                  disabled={isSubmitting}
                />
                <div className="flex gap-2">
                  <button
                    className="text-xs text-green-600 hover:underline"
                    onClick={saveEdit}
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? "Saving..." : "Save"}
                  </button>
                  <button
                    className="text-xs text-gray-600 hover:underline"
                    onClick={cancelEdit}
                    disabled={isSubmitting}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <>
                <p className="text-sm mt-2">{comment.text}</p>
                {currentUserId && comment.user.id === currentUserId && (
                  <div className="flex gap-2 mt-2">
                    <button
                      className="text-xs text-blue-600 hover:underline"
                      onClick={() => startEdit(comment)}
                    >
                      Edit
                    </button>
                    {onDelete && (
                      <button
                        className="text-xs text-red-600 hover:underline"
                        onClick={() => onDelete(comment)}
                      >
                        Delete
                      </button>
                    )}
                  </div>
                )}
              </>
            )}
          {renderReply && renderReply(comment)}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  )
}
