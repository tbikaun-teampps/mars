import * as React from "react";
import { formatDistanceToNow } from "date-fns";
import { Trash2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  useReviewComments,
  useCreateReviewComment,
  useDeleteReviewComment,
} from "@/api/queries";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const commentSchema = z.object({
  comment: z
    .string()
    .min(1, "Comment cannot be empty")
    .max(1000, "Comment is too long"),
});

type CommentFormData = z.infer<typeof commentSchema>;

interface ReviewCommentsProps {
  materialNumber: number;
  reviewId: number;
  hideInput?: boolean;
  hideHeader?: boolean;
}

export function ReviewComments({
  materialNumber,
  reviewId,
  hideInput = false,
  hideHeader = false,
}: ReviewCommentsProps) {
  const { user } = useAuth();
  const [pageIndex, setPageIndex] = React.useState(0);
  const pageSize = 20;

  // Fetch comments
  const { data, isLoading, isError, error } = useReviewComments(
    materialNumber,
    reviewId,
    {
      skip: pageIndex * pageSize,
      limit: pageSize,
    }
  );

  const comments = data?.items ?? [];
  const total = data?.total ?? 0;
  const hasMore = (pageIndex + 1) * pageSize < total;
  const hasPrevious = pageIndex > 0;

  // Mutations
  const createComment = useCreateReviewComment();
  const deleteComment = useDeleteReviewComment();

  // Form
  const form = useForm<CommentFormData>({
    resolver: zodResolver(commentSchema),
    defaultValues: {
      comment: "",
    },
  });

  const onSubmit = async (data: CommentFormData) => {
    try {
      await createComment.mutateAsync({
        materialNumber,
        reviewId,
        data,
      });
      form.reset();
      toast.success("Comment posted successfully");
    } catch (error) {
      toast.error("Failed to post comment");
      console.error(error);
    }
  };

  const handleDelete = async (commentId: number) => {
    if (!confirm("Are you sure you want to delete this comment?")) {
      return;
    }

    try {
      await deleteComment.mutateAsync({
        commentId,
        materialNumber,
        reviewId,
      });
      toast.success("Comment deleted successfully");
    } catch (error) {
      toast.error("Failed to delete comment");
      console.error(error);
    }
  };

  return (
    <div>
      {!hideHeader && (
        <div className="flex items-center gap-4 mb-4">
          <div className="flex-1 border-t border-gray-300" />
          <h3 className="text-md font-semibold whitespace-nowrap">
            Review Comments ({total})
          </h3>
          <div className="flex-1 border-t border-gray-300" />
        </div>
      )}
      <div className="space-y-4">
        {/* Comment form */}
        {!hideInput && (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3">
              <FormField
                control={form.control}
                name="comment"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Add a comment</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Share your thoughts about this review..."
                        className="resize-none"
                        rows={3}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="flex justify-end">
                <Button
                  type="submit"
                  size="sm"
                  disabled={createComment.isPending || !form.formState.isDirty}
                >
                  {createComment.isPending ? "Posting..." : "Post Comment"}
                </Button>
              </div>
            </form>
          </Form>
        )}
        {/* Comments list */}
        <div className={cn("space-y-3", !hideInput && "pt-4 border-t")}>
          {isLoading && (
            <div className="text-sm text-muted-foreground text-center py-8">
              Loading comments...
            </div>
          )}

          {isError && (
            <div className="text-sm text-destructive text-center py-8">
              Error loading comments: {error?.message}
            </div>
          )}

          {!isLoading && !isError && comments.length === 0 && (
            <div className="text-sm text-muted-foreground text-center py-8">
              No comments added yet.
            </div>
          )}

          {comments.map((comment) => {
            const isOwner = user?.id === comment.user_id;
            const userName = comment.user?.full_name || "Unknown User";

            return (
              <div
                key={comment.comment_id}
                className="border rounded-lg p-4 space-y-2"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <div className="flex items-baseline gap-2">
                      <span className="font-medium text-sm">{userName}</span>
                      <span className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(comment.created_at), {
                          addSuffix: true,
                        })}
                      </span>
                    </div>
                    <p className="text-sm mt-2 whitespace-pre-wrap">
                      {comment.comment}
                    </p>
                  </div>
                  {isOwner && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(comment.comment_id)}
                      disabled={deleteComment.isPending}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            );
          })}

          {/* Pagination */}
          {(hasMore || hasPrevious) && (
            <div className="flex items-center justify-between pt-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPageIndex(pageIndex - 1)}
                disabled={!hasPrevious || isLoading}
              >
                Previous
              </Button>
              <span className="text-sm text-muted-foreground">
                Showing {pageIndex * pageSize + 1} -{" "}
                {Math.min((pageIndex + 1) * pageSize, total)} of {total}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPageIndex(pageIndex + 1)}
                disabled={!hasMore || isLoading}
              >
                Next
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
