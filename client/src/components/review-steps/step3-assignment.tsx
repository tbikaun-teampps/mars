import * as React from "react";
import { useFormContext } from "react-hook-form";
import { Label } from "@/components/ui/label";
import { UserPickerByPermission } from "@/components/user-picker-by-permission";
import { useReviewAssignments } from "@/api/queries";
import { Stepheader } from "./step-header";

interface Step3AssignmentProps {
  materialNumber?: number;
  reviewId?: number | null;
  isStatusLocked?: boolean;
}

export function Step3Assignment({
  materialNumber,
  reviewId,
  isStatusLocked = false,
}: Step3AssignmentProps) {
  const { watch, setValue } = useFormContext();
  const smeUserId = watch("smeUserId");
  const approverUserId = watch("approverUserId");

  // Fetch existing assignments to pre-populate the form
  const { data: assignments } = useReviewAssignments(materialNumber, reviewId);

  // Pre-populate form with existing assignments
  React.useEffect(() => {
    if (assignments && assignments.length > 0) {
      const smeAssignment = assignments.find(
        (a) => a.assignment_type === "sme"
      );
      const approverAssignment = assignments.find(
        (a) => a.assignment_type === "approver"
      );

      if (smeAssignment && !smeUserId) {
        setValue("smeUserId", smeAssignment.user_id, { shouldDirty: true });
      }
      if (approverAssignment && !approverUserId) {
        setValue("approverUserId", approverAssignment.user_id, { shouldDirty: true });
      }
    }
  }, [assignments, smeUserId, approverUserId, setValue]);

  return (
    <div className="space-y-6">
      <Stepheader title="Review Assignment" />

      <div className="space-y-6">
        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            Assign Subject Matter Expert (SME){" "}
            <span className="text-destructive">*</span>
          </Label>
          <UserPickerByPermission
            permission="can_provide_sme_review"
            groupByExpertise={true}
            value={smeUserId}
            onChange={(userId) => setValue("smeUserId", userId, { shouldDirty: true })}
            placeholder="Select SME..."
            disabled={isStatusLocked}
          />
          <p className="text-xs text-muted-foreground">
            The assigned subject matter expert (SME) will complete the SME Review step, providing
            technical analysis and recommendations.
          </p>
        </div>

        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            Assign Approver <span className="text-destructive">*</span>
          </Label>
          <UserPickerByPermission
            permission="can_approve_reviews"
            groupByExpertise={false}
            value={approverUserId}
            onChange={(userId) => setValue("approverUserId", userId, { shouldDirty: true })}
            placeholder="Select Approver..."
            disabled={isStatusLocked}
          />
          <p className="text-xs text-muted-foreground">
            The assigned Approver will make the final decision and complete this
            review.
          </p>
        </div>
      </div>
    </div>
  );
}
