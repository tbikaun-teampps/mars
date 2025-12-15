import { useState, useEffect, useCallback } from "react";
import { Upload, FileText, CheckCircle, AlertCircle, Loader2, ExternalLink } from "lucide-react";
import { Link } from "react-router-dom";
import { useUploadSAPData, useUploadJobHistory } from "@/api/queries";
import { queryKeys } from "@/api/query-keys";
import { apiClient, UploadJobStatus } from "@/api/client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { useQueryClient } from "@tanstack/react-query";

interface UploadSAPDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// Map phase names to user-friendly labels
const phaseLabels: Record<string, string> = {
  validating: "Validating CSV...",
  materials: "Uploading materials...",
  insights: "Generating insights...",
  reviews: "Creating reviews...",
};

export function UploadSAPDialog({ open, onOpenChange }: UploadSAPDialogProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [jobId, setJobId] = useState<string | null>(null);
  const [jobStatus, setJobStatus] = useState<UploadJobStatus | null>(null);
  const [error, setError] = useState<string | null>(null);

  const uploadMutation = useUploadSAPData();
  const queryClient = useQueryClient();

  // Fetch last upload (only when dialog is open and not currently uploading)
  const { data: historyData } = useUploadJobHistory({ limit: 1, skip: 0 }, open && !jobId);
  const lastUpload = historyData?.jobs[0];

  // Determine upload state
  const isUploading = uploadMutation.isPending;
  const isProcessing = jobId !== null && jobStatus?.status === "processing";
  const isPending = jobId !== null && jobStatus?.status === "pending";
  const isCompleted = jobStatus?.status === "completed";
  const isFailed = jobStatus?.status === "failed";
  const isBusy = isUploading || isProcessing || isPending;

  // Poll for job status
  const pollStatus = useCallback(async () => {
    if (!jobId) return;

    try {
      const status = await apiClient.getUploadJobStatus(jobId);
      setJobStatus(status);

      if (status.status === "completed") {
        // Invalidate queries to refresh data across the app
        queryClient.invalidateQueries({ queryKey: queryKeys.materials.all });
        queryClient.invalidateQueries({ queryKey: queryKeys.uploadJobs.all });
        queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.all });
      } else if (status.status === "failed") {
        setError(status.error || "Upload processing failed");
      }
    } catch (err) {
      console.error("Failed to poll job status:", err);
    }
  }, [jobId, queryClient]);

  // Set up polling interval
  useEffect(() => {
    if (!jobId || isCompleted || isFailed) return;

    // Poll immediately
    pollStatus();

    // Then poll every 2 seconds
    const interval = setInterval(pollStatus, 2000);

    return () => clearInterval(interval);
  }, [jobId, isCompleted, isFailed, pollStatus]);

  // Auto-close dialog after successful completion
  useEffect(() => {
    if (isCompleted) {
      const timer = setTimeout(() => {
        handleClose();
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [isCompleted]);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setJobId(null);
      setJobStatus(null);
      setError(null);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    setError(null);
    setJobId(null);
    setJobStatus(null);

    uploadMutation.mutate(selectedFile, {
      onSuccess: (data) => {
        // Set the job ID to start polling
        setJobId(data.job_id);
      },
      onError: (err) => {
        setError(err.message || "Failed to start upload. Please try again.");
      },
    });
  };

  const handleClose = () => {
    if (!isBusy) {
      onOpenChange(false);
      // Reset state after dialog closes
      setTimeout(() => {
        setSelectedFile(null);
        setJobId(null);
        setJobStatus(null);
        setError(null);
        const fileInput = document.getElementById("csv-file-input") as HTMLInputElement;
        if (fileInput) fileInput.value = "";
      }, 150);
    }
  };

  // Get current phase label
  const currentPhaseLabel = jobStatus?.current_phase
    ? phaseLabels[jobStatus.current_phase] || jobStatus.current_phase
    : "Starting...";

  return (
    <>
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Upload SAP Data</DialogTitle>
            <DialogDescription>
              Select a CSV file to upload SAP material data to the system.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Last upload summary */}
            {lastUpload && !jobId && !selectedFile && (
              <div className="rounded-md border bg-muted/50 p-3">
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2 min-w-0">
                    <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                    <span className="truncate font-medium">{lastUpload.file_name || "Unknown file"}</span>
                    {lastUpload.status === "completed" && lastUpload.result && (
                      <span className="text-green-600 text-xs shrink-0">
                        {lastUpload.result.inserted.toLocaleString()} materials
                      </span>
                    )}
                    {lastUpload.status === "failed" && (
                      <span className="text-red-600 text-xs shrink-0">Failed</span>
                    )}
                  </div>
                  <Link
                    to="/app/uploads"
                    className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 shrink-0 ml-2"
                    onClick={() => onOpenChange(false)}
                  >
                    View all
                    <ExternalLink className="h-3 w-3" />
                  </Link>
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="csv-file-input">CSV File</Label>
              <Input
                id="csv-file-input"
                type="file"
                accept=".csv"
                onChange={handleFileChange}
                disabled={isBusy}
              />
            </div>

            {selectedFile && !isProcessing && !isPending && !isCompleted && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <FileText className="h-4 w-4" />
                <span>{selectedFile.name}</span>
                <span className="text-xs">({(selectedFile.size / 1024).toFixed(2)} KB)</span>
              </div>
            )}

            {/* Progress display during processing */}
            {(isProcessing || isPending) && jobStatus && (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin text-primary" />
                  <span className="text-sm font-medium">{currentPhaseLabel}</span>
                </div>

                <Progress value={jobStatus.progress.percentage} />

                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>
                    {jobStatus.progress.processed.toLocaleString()} of{" "}
                    {jobStatus.progress.total.toLocaleString()} records
                  </span>
                  <span>{jobStatus.progress.percentage.toFixed(1)}%</span>
                </div>
              </div>
            )}

            {/* Success message */}
            {isCompleted && jobStatus?.result && (
              <div className="flex items-start gap-2 rounded-md bg-green-50 p-3 text-sm text-green-900">
                <CheckCircle className="h-5 w-5 shrink-0" />
                <div>
                  <p className="font-medium">Upload completed successfully!</p>
                  <p className="text-xs mt-1">
                    {jobStatus.result.inserted.toLocaleString()} materials processed,{" "}
                    {jobStatus.result.insights.toLocaleString()} insights generated,{" "}
                    {jobStatus.result.reviews.toLocaleString()} reviews created.
                  </p>
                </div>
              </div>
            )}

            {/* Error message */}
            {(error || isFailed) && (
              <div className="flex items-start gap-2 rounded-md bg-red-50 p-3 text-sm text-red-900">
                <AlertCircle className="h-5 w-5 shrink-0" />
                <p>{error || jobStatus?.error || "Upload failed. Please try again."}</p>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={handleClose}
              disabled={isBusy}
            >
              {isCompleted ? "Close" : "Cancel"}
            </Button>
            {!isCompleted && (
              <Button
                onClick={handleUpload}
                disabled={!selectedFile || isBusy}
              >
                {isUploading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Starting...
                  </>
                ) : isProcessing || isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <Upload className="mr-2 h-4 w-4" />
                    Upload
                  </>
                )}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
