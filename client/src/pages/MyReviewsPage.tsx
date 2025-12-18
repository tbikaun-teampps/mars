import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";
import {
  ClipboardList,
  FileText,
  UserCheck,
  Clock,
  CheckCircle2,
  FilePlus2,
} from "lucide-react";
import { useMyAssignments, useMyInitiatedReviews } from "@/api/queries";
import { AppLayout } from "@/components/app-layout";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type RoleFilter = "all" | "sme" | "approver";
type StatusFilter = "all" | "pending" | "completed";

export function MyReviewsPage() {
  const navigate = useNavigate();
  const [roleFilter, setRoleFilter] = useState<RoleFilter>("all");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");

  // Build query params based on filters
  const queryParams = {
    assignment_type: roleFilter === "all" ? undefined : roleFilter,
    status: statusFilter === "all" ? undefined : statusFilter,
  };

  const { data: assignments, isLoading } = useMyAssignments(queryParams);
  const { data: initiatedReviews, isLoading: isLoadingInitiated } =
    useMyInitiatedReviews();

  const breadcrumbs = [{ label: "App", href: "/app" }, { label: "My Reviews" }];

  const handleRowClick = (materialNumber: number, reviewId: number) => {
    navigate(`/app/materials/${materialNumber}/review/${reviewId}`);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return (
          <Badge
            variant="outline"
            className="border-yellow-500 text-yellow-700 bg-yellow-50"
          >
            <Clock className="h-3 w-3 mr-1" />
            Pending
          </Badge>
        );
      case "accepted":
        return (
          <Badge
            variant="outline"
            className="border-blue-500 text-blue-700 bg-blue-50"
          >
            <UserCheck className="h-3 w-3 mr-1" />
            Accepted
          </Badge>
        );
      case "completed":
        return (
          <Badge
            variant="outline"
            className="border-green-500 text-green-700 bg-green-50"
          >
            <CheckCircle2 className="h-3 w-3 mr-1" />
            Completed
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getRoleBadge = (assignmentType: string) => {
    switch (assignmentType) {
      case "sme":
        return <Badge variant="secondary">SME Review</Badge>;
      case "approver":
        return <Badge variant="default">Approver</Badge>;
      default:
        return <Badge variant="outline">{assignmentType}</Badge>;
    }
  };

  const getReviewStatusBadge = (reviewStatus: string) => {
    switch (reviewStatus) {
      case "draft":
        return <Badge variant="outline">Draft</Badge>;
      case "pending_assignment":
        return (
          <Badge
            variant="outline"
            className="border-orange-500 text-orange-700 bg-orange-50"
          >
            Pending Assignment
          </Badge>
        );
      case "pending_sme":
        return (
          <Badge
            variant="outline"
            className="border-blue-500 text-blue-700 bg-blue-50"
          >
            Awaiting SME
          </Badge>
        );
      case "pending_decision":
        return (
          <Badge
            variant="outline"
            className="border-purple-500 text-purple-700 bg-purple-50"
          >
            Awaiting Decision
          </Badge>
        );
      case "approved":
        return (
          <Badge
            variant="outline"
            className="border-green-500 text-green-700 bg-green-50"
          >
            Approved
          </Badge>
        );
      case "rejected":
        return (
          <Badge
            variant="outline"
            className="border-red-500 text-red-700 bg-red-50"
          >
            Rejected
          </Badge>
        );
      case "cancelled":
        return <Badge variant="destructive">Cancelled</Badge>;
      default:
        return <Badge variant="outline">{reviewStatus}</Badge>;
    }
  };

  return (
    <AppLayout breadcrumbs={breadcrumbs}>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold flex items-center gap-2">
          <ClipboardList className="h-6 w-6" />
          My Reviews
        </h1>
        <p className="text-muted-foreground">
          Reviews assigned to you and reviews you have created.
        </p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Assigned Reviews
              </CardTitle>
              <CardDescription>
                Click on a row to open the review.
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              {/* Role filter tabs */}
              <div className="flex rounded-md border">
                <Button
                  variant={roleFilter === "all" ? "default" : "ghost"}
                  size="sm"
                  className="rounded-r-none"
                  onClick={() => setRoleFilter("all")}
                >
                  All
                </Button>
                <Button
                  variant={roleFilter === "sme" ? "default" : "ghost"}
                  size="sm"
                  className="rounded-none border-x"
                  onClick={() => setRoleFilter("sme")}
                >
                  SME Reviews
                </Button>
                <Button
                  variant={roleFilter === "approver" ? "default" : "ghost"}
                  size="sm"
                  className="rounded-l-none"
                  onClick={() => setRoleFilter("approver")}
                >
                  Approvals
                </Button>
              </div>

              {/* Status filter */}
              <Select
                value={statusFilter}
                onValueChange={(value) =>
                  setStatusFilter(value as StatusFilter)
                }
              >
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : assignments && assignments.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Material</TableHead>
                  <TableHead>Review</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Assignment Status</TableHead>
                  <TableHead>Review Status</TableHead>
                  <TableHead>Assigned</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {assignments.map((assignment) => (
                  <TableRow
                    key={assignment.assignment_id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() =>
                      handleRowClick(
                        assignment.material_number,
                        assignment.review_id
                      )
                    }
                  >
                    <TableCell className="font-medium">
                      {assignment.material_number}
                    </TableCell>
                    <TableCell>{assignment.review_id}</TableCell>
                    <TableCell className="max-w-[200px] truncate">
                      {assignment.material_description || (
                        <span className="text-muted-foreground italic">
                          No description
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      {getRoleBadge(assignment.assignment_type)}
                    </TableCell>
                    <TableCell>{getStatusBadge(assignment.status)}</TableCell>
                    <TableCell>
                      {getReviewStatusBadge(assignment.review_status)}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {formatDistanceToNow(new Date(assignment.assigned_at), {
                        addSuffix: true,
                      })}
                      {assignment.assigned_by_name && (
                        <span className="block text-xs">
                          by {assignment.assigned_by_name}
                        </span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-12">
              <ClipboardList className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium">No assignments found</h3>
              <p className="text-muted-foreground">
                {roleFilter !== "all" || statusFilter !== "all"
                  ? "Try adjusting your filters to see more results."
                  : "You don't have any reviews assigned to you yet."}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Reviews I Created section */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FilePlus2 className="h-5 w-5" />
            Reviews I Created
          </CardTitle>
          <CardDescription>
            Reviews you have initiated. Click on a row to open the review.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoadingInitiated ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : initiatedReviews && initiatedReviews.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Material</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Proposed Action</TableHead>
                  <TableHead>Created</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {initiatedReviews.map((review) => (
                  <TableRow
                    key={review.review_id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() =>
                      handleRowClick(review.material_number, review.review_id)
                    }
                  >
                    <TableCell className="font-medium">
                      {review.material_number}
                    </TableCell>
                    <TableCell className="max-w-[200px] truncate">
                      {review.material_description || (
                        <span className="text-muted-foreground italic">
                          No description
                        </span>
                      )}
                    </TableCell>
                    <TableCell>{getReviewStatusBadge(review.status)}</TableCell>
                    <TableCell>
                      {(review.proposed_action && (
                        <span className="capitalize">
                          {review.proposed_action.replace(/_/g, " ")}
                        </span>
                      )) || (
                        <span className="text-muted-foreground italic">
                          Not set
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {formatDistanceToNow(new Date(review.created_at), {
                        addSuffix: true,
                      })}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-12">
              <FilePlus2 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium">No reviews created</h3>
              <p className="text-muted-foreground">
                You haven't created any reviews yet.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </AppLayout>
  );
}
