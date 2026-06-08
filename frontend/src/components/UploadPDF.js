import React, { useRef, useState } from "react";
import uploadlogo from "../icons/upload_logo.svg";
import { toast } from "react-toastify";
import { api } from "../api";

function UploadPDF({ onFileUpload = () => { }, onUploadComplete = () => { } }) {
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);

  const handleUpload = () => {
    if (!uploading) {
      fileInputRef.current.click();
    }
  };

  const handleFileChange = async (event) => {
    const selectedFile = event.target.files[0];
    event.target.value = "";

    if (!selectedFile) {
      return;
    }

    setUploading(true);
    const formData = new FormData();
    formData.append("file", selectedFile);

    try {
      const response = await api.post("/upload-pdf/", formData, {
        timeout: 300000,
      });

      if (response.data?.document_id) {
        toast.success(`Uploaded ${response.data.filename} successfully.`);

        try {
          onFileUpload(response.data.document_id);
          onUploadComplete(response.data.filename);
        } catch (callbackError) {
          console.error("Upload succeeded, but UI callback failed:", callbackError);
          toast.warn("Upload succeeded, but the file list could not refresh.");
        }
      } else if (response.data?.duplicate) {
        toast.warn(response.data.message);
      }
    } catch (error) {
      console.error("Upload failed:", {
        message: error.message,
        code: error.code,
        status: error.response?.status,
        data: error.response?.data,
        headers: error.response?.headers,
        requestUrl: error.config?.url,
        baseURL: error.config?.baseURL,
        timeout: error.config?.timeout,
      });

      const detail = error.response?.data?.detail;

      const errorMessage =
        typeof detail === "string"
          ? detail
          : detail
            ? JSON.stringify(detail)
            : error.code === "ECONNABORTED"
              ? "Upload timed out while indexing. The PDF may still finish processing on the server."
              : error.message || "Failed to upload PDF. Please try again.";

      toast.error(errorMessage);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div>
      <button
        type="button"
        onClick={handleUpload}
        disabled={uploading}
        className="group flex w-full items-center justify-center gap-3 rounded-xl bg-emerald-700 px-4 py-3.5 text-sm font-semibold text-white shadow-lg shadow-emerald-700/20 transition hover:bg-emerald-800 disabled:cursor-wait disabled:opacity-75"
      >
        {uploading ? (
          <span className="h-5 w-5 animate-spin rounded-full border-2 border-white/40 border-t-white" />
        ) : (
          <img src={uploadlogo} alt="" className="h-5 w-5 brightness-0 invert" />
        )}
        {uploading ? "Uploading and indexing..." : "Upload a PDF"}
      </button>
      <input
        type="file"
        accept="application/pdf"
        ref={fileInputRef}
        onChange={handleFileChange}
        className="hidden"
      />
      <div className=" border-green-400 flex justify-end">
        <p className="mt-0 text-xs text-pretty leading-6 text-slate-500">
          PDF should be at most 1MB
        </p>
      </div>
      
    </div>
  );
}

export default UploadPDF;
