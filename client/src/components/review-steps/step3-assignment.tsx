import * as React from "react";
import { useFormContext } from "react-hook-form";
import { Info, Users } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Label } from "@/components/ui/label";
import { UserPickerByPermission } from "@/components/user-picker-by-permission";
import { useReviewAssignments } from "@/api/queries";

interface Step3AssignmentProps {
  materialNumber?: number;
  reviewId?: number | null;
}

export function Step3Assignment({
  materialNumber,
  reviewId,
}: Step3AssignmentProps) {
  const { watch, setValue } = useFormContext();
  const smeUserId = watch("smeUserId");
  const approverUserId = watch("approverUserId");

  // Fetch existing assignments to pre-populate the form
  const { data: assignments } = useReviewAssignments(materialNumber, reviewId);

  // Pre-populate form with existing assignments
  React.useEffect(() => {
    if (assignments && assignments.length > 0) {
      const smeAssignment = assignments.find((a) => a.assignment_type === "sme");
      const approverAssignment = assignments.find(
        (a) => a.assignment_type === "approver"
      );

      if (smeAssignment && !smeUserId) {
        setValue("smeUserId", smeAssignment.user_id);
      }
      if (approverAssignment && !approverUserId) {
        setValue("approverUserId", approverAssignment.user_id);
      }
    }
  }, [assignments, smeUserId, approverUserId, setValue]);

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium">Review Assignment</h3>
        <p className="text-sm text-muted-foreground">
          Assign a Subject Matter Expert (SME) and an Approver to this review.
        </p>
      </div>

      <Alert className="border-blue-200 bg-blue-50">
        <Info className="h-4 w-4 text-blue-600" />
        <AlertDescription className="text-blue-800">
          The assigned SME will complete the SME Review step, and the assigned
          Approver will make the final decision. Only users with the
          appropriate permissions are shown.
        </AlertDescription>
      </Alert>

      <div className="space-y-6">
        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Assign SME <span className="text-destructive">*</span>
          </Label>
          <UserPickerByPermission
            permission="can_provide_sme_review"
            groupByExpertise={true}
            value={smeUserId}
            onChange={(userId) => setValue("smeUserId", userId)}
            placeholder="Select SME..."
          />
          <p className="text-xs text-muted-foreground">
            The SME will review the material and provide technical
            recommendations.
          </p>
        </div>

        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Assign Approver <span className="text-destructive">*</span>
          </Label>
          <UserPickerByPermission
            permission="can_approve_reviews"
            groupByExpertise={false}
            value={approverUserId}
            onChange={(userId) => setValue("approverUserId", userId)}
            placeholder="Select Approver..."
          />
          <p className="text-xs text-muted-foreground">
            The Approver will make the final decision on this review.
          </p>
        </div>
      </div>
    </div>
  );
}
