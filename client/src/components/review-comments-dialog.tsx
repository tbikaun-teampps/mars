import { MessageSquare } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ReviewComments } from "@/components/review-comments";
import { useReviewComments } from "@/api/queries";

interface ReviewCommentsDialogProps {
  materialNumber: number;
  reviewId: number;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  hideInput?: boolean;
}

export function ReviewCommentsDialog({
  materialNumber,
  reviewId,
  isOpen,
  onOpenChange,
  hideInput = false,
}: ReviewCommentsDialogProps) {
  // Fetch comment count for the title
  const { data } = useReviewComments(
    materialNumber,
    reviewId,
    { skip: 0, limit: 1 },
    isOpen // Only fetch when dialog is open
  );

  const commentCount = data?.total ?? 0;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Review Comments ({commentCount})
          </DialogTitle>
        </DialogHeader>

        <div className="mt-4">
          <ReviewComments
            materialNumber={materialNumber}
            reviewId={reviewId}
            hideInput={hideInput}
            hideHeader={true}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
