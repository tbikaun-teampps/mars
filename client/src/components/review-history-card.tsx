import {
  Circle,
  CheckCircle2,
  XCircle,
  Clock,
  UserCheck,
  FileCheck,
} from "lucide-react";

export function getReviewStatusConfig(status: string): {
  badge: string;
  label: string;
  icon: React.ReactNode;
} {
  switch (status.toLowerCase()) {
    case "draft":
      return {
        badge: "bg-yellow-500/10 text-yellow-700 border-yellow-500/50",
        label: "Draft",
        icon: <Circle className="h-3 w-3 fill-yellow-500 text-yellow-500" />,
      };
    case "pending_assignment":
      return {
        badge: "bg-orange-500/10 text-orange-700 border-orange-500/50",
        label: "Pending Assignment",
        icon: <Clock className="h-3 w-3 text-orange-500" />,
      };
    case "pending_sme":
      return {
        badge: "bg-blue-500/10 text-blue-700 border-blue-500/50",
        label: "Pending SME",
        icon: <UserCheck className="h-3 w-3 text-blue-500" />,
      };
    case "pending_decision":
      return {
        badge: "bg-purple-500/10 text-purple-700 border-purple-500/50",
        label: "Pending Decision",
        icon: <FileCheck className="h-3 w-3 text-purple-500" />,
      };
    case "approved":
      return {
        badge: "bg-green-500/10 text-green-700 border-green-500/50",
        label: "Approved",
        icon: <CheckCircle2 className="h-3 w-3 text-green-500" />,
      };
    case "rejected":
      return {
        badge: "bg-red-500/10 text-red-700 border-red-500/50",
        label: "Rejected",
        icon: <XCircle className="h-3 w-3 text-red-500" />,
      };
    case "cancelled":
      return {
        badge: "bg-red-500/10 text-red-700 border-red-500/50",
        label: "Cancelled",
        icon: <XCircle className="h-3 w-3 text-red-500" />,
      };
    default:
      return {
        badge: "bg-gray-500/10 text-gray-700 border-gray-500/50",
        label: status,
        icon: <Circle className="h-3 w-3 text-gray-500" />,
      };
  }
}
