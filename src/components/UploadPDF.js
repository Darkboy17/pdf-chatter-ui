import React, { useRef, useState } from "react";
import uploadlogo from "../icons/upload_logo.svg";
import { toast } from "react-toastify";
import { api } from "../api";

function UploadPDF({ onFileUpload = () => {}, onUploadComplete = () => {} }) {
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
        headers: { "Content-Type": "multipart/form-data" },
      });

      if (response.data?.document_id) {
        onFileUpload(response.data.document_id);
        onUploadComplete(response.data.filename);
        toast.success(`Uploaded ${response.data.filename} successfully.`);
      } else if (response.data?.duplicate) {
        toast.warn(response.data.message);
      }
    } catch (error) {
      const errorMessage =
        error.response?.data?.detail || "Failed to upload PDF. Please try again.";
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
    </div>
  );
}

export default UploadPDF;
