import { History, FileText, CheckCircle, AlertCircle, Loader2, Clock } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { useUploadJobHistory } from "@/api/queries";
import { UploadJobStatus } from "@/api/client";

interface UploadHistoryModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function formatFileSize(bytes: number | null | undefined): string {
  if (!bytes) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function formatDate(dateString: string | null): string {
  if (!dateString) return "—";
  return new Date(dateString).toLocaleString();
}

function StatusBadge({ status }: { status: UploadJobStatus["status"] }) {
  switch (status) {
    case "completed":
      return (
        <Badge className="bg-green-100 text-green-800 border-green-200">
          <CheckCircle className="h-3 w-3" />
          Completed
        </Badge>
      );
    case "failed":
      return (
        <Badge variant="destructive">
          <AlertCircle className="h-3 w-3" />
          Failed
        </Badge>
      );
    case "processing":
      return (
        <Badge className="bg-blue-100 text-blue-800 border-blue-200">
          <Loader2 className="h-3 w-3 animate-spin" />
          Processing
        </Badge>
      );
    case "pending":
      return (
        <Badge variant="secondary">
          <Clock className="h-3 w-3" />
          Pending
        </Badge>
      );
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
}

function UploadJobRow({ job }: { job: UploadJobStatus }) {
  return (
    <div className="border rounded-lg p-3 space-y-2">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
          <span className="font-medium truncate">
            {job.file_name || "Unknown file"}
          </span>
        </div>
        <StatusBadge status={job.status} />
      </div>

      <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm text-muted-foreground">
        <div>Size: {formatFileSize(job.file_size_bytes)}</div>
        <div>Started: {formatDate(job.created_at)}</div>
        {job.status === "completed" && job.result && (
          <>
            <div>Materials: {job.result.inserted.toLocaleString()}</div>
            <div>Insights: {job.result.insights.toLocaleString()}</div>
          </>
        )}
        {job.status === "failed" && job.error && (
          <div className="col-span-2 text-red-600 text-xs mt-1">
            Error: {job.error}
          </div>
        )}
        {(job.status === "processing" || job.status === "pending") && (
          <div className="col-span-2">
            Progress: {job.progress.percentage.toFixed(1)}%
          </div>
        )}
      </div>
    </div>
  );
}

export function UploadHistoryModal({ open, onOpenChange }: UploadHistoryModalProps) {
  const { data, isLoading, error } = useUploadJobHistory(50, 0, open);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            Upload History
            {data && <span className="text-muted-foreground font-normal">({data.total})</span>}
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-3 pr-2">
          {isLoading && (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          )}

          {error && (
            <div className="flex items-center gap-2 text-red-600 py-4">
              <AlertCircle className="h-5 w-5" />
              <span>Failed to load upload history</span>
            </div>
          )}

          {data && data.jobs.length === 0 && (
            <div className="text-center text-muted-foreground py-8">
              No uploads yet
            </div>
          )}

          {data?.jobs.map((job) => (
            <UploadJobRow key={job.job_id} job={job} />
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
