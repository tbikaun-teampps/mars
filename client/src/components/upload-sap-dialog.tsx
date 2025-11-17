import { useState } from "react";
import { Upload, FileText, CheckCircle, AlertCircle } from "lucide-react";
import { useUploadSAPData } from "@/api/queries";
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

interface UploadSAPDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function UploadSAPDialog({ open, onOpenChange }: UploadSAPDialogProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadStatus, setUploadStatus] = useState<"idle" | "success" | "error">("idle");
  const [uploadMessage, setUploadMessage] = useState<string>("");

  const uploadMutation = useUploadSAPData();

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setUploadStatus("idle");
      setUploadMessage("");
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    uploadMutation.mutate(selectedFile, {
      onSuccess: (data) => {
        setUploadStatus("success");
        setUploadMessage(
          `Successfully uploaded! ${data.records_inserted} records inserted, ${data.records_skipped} skipped, ${data.reviews_inserted} reviews created.`
        );
        setSelectedFile(null);
        // Reset file input
        const fileInput = document.getElementById("csv-file-input") as HTMLInputElement;
        if (fileInput) fileInput.value = "";

        // Close dialog after 2 seconds
        setTimeout(() => {
          onOpenChange(false);
          setUploadStatus("idle");
          setUploadMessage("");
        }, 2000);
      },
      onError: (error) => {
        setUploadStatus("error");
        setUploadMessage(error.message || "Failed to upload file. Please try again.");
      },
    });
  };

  const handleClose = () => {
    if (!uploadMutation.isPending) {
      onOpenChange(false);
      setSelectedFile(null);
      setUploadStatus("idle");
      setUploadMessage("");
      const fileInput = document.getElementById("csv-file-input") as HTMLInputElement;
      if (fileInput) fileInput.value = "";
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Upload SAP Data</DialogTitle>
          <DialogDescription>
            Select a CSV file to upload SAP material data to the system.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="csv-file-input">CSV File</Label>
            <Input
              id="csv-file-input"
              type="file"
              accept=".csv"
              onChange={handleFileChange}
              disabled={uploadMutation.isPending}
            />
          </div>

          {selectedFile && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <FileText className="h-4 w-4" />
              <span>{selectedFile.name}</span>
              <span className="text-xs">({(selectedFile.size / 1024).toFixed(2)} KB)</span>
            </div>
          )}

          {uploadStatus === "success" && (
            <div className="flex items-start gap-2 rounded-md bg-green-50 p-3 text-sm text-green-900">
              <CheckCircle className="h-5 w-5 shrink-0" />
              <p>{uploadMessage}</p>
            </div>
          )}

          {uploadStatus === "error" && (
            <div className="flex items-start gap-2 rounded-md bg-red-50 p-3 text-sm text-red-900">
              <AlertCircle className="h-5 w-5 shrink-0" />
              <p>{uploadMessage}</p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={uploadMutation.isPending}
          >
            Cancel
          </Button>
          <Button
            onClick={handleUpload}
            disabled={!selectedFile || uploadMutation.isPending}
          >
            {uploadMutation.isPending ? (
              <>Uploading...</>
            ) : (
              <>
                <Upload className="mr-2 h-4 w-4" />
                Upload
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
