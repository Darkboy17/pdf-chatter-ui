import React, { useState, useRef } from "react";
import axios from "axios";
import uploadlogo from "../icons/upload_logo.svg";
import { toast } from "react-toastify";

function UploadPDF({ onFileUpload = () => {}, onUploadComplete }) {

  // URL of the backend API hosted on the cloud
  const backendURL = "https://darkboy18-pdf-chatter.sliplane.app/"

  // State variables

  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);

  // Function to open file input dialog
  const handleUpload = () => {
    // Open the file input dialog
    fileInputRef.current.click();
  };

  // Function to handle file selection change
  const handleFileChange = async (event) => {

    const selectedFile = event.target.files[0];

    setUploading(true); // Set loading to true when upload starts

    if (selectedFile) {

      // Create FormData object
      const formData = new FormData();
      formData.append("file", selectedFile);

      try {

        // Send POST request to upload the file
        const response = await axios.post(
          `${backendURL}/upload-pdf/`,
          formData,
          {
            headers: { "Content-Type": "multipart/form-data" },
          }
        );

        // Pass the uploaded filename to the parent component only after upload succeeds
        if (response.data && response.data.document_id) {

          onFileUpload(response.data.document_id);

          onUploadComplete(response.data.filename);

          toast.success(`Uploaded ${response.data.filename} successfully`);

        } else if (response.data.duplicate) {

          toast.warn(response.data.message);

        }
      } catch (error) {

        if (error.response) {
          // Error from server, display message
          const errorMessage = error.response.data.detail || "Failed to upload PDF";
          toast.error(errorMessage);
      } else {
          // Network error or other issues
          toast.error("An unexpected error occurred. Please try again.");
      }
        
      } finally {
        // Set loading to false after upload finishes
        setUploading(false); // Set loading to false after upload finishes

      }
    }
  };

  return (
    <div className="flex items-center">
      {/* Upload Button */}
      <div
        onClick={handleUpload}
        className="md:px-2 px-4 py-2 border border-black rounded-lg flex items-center space-x-2 cursor-pointer"
      >
        {uploading ? (
          <>
            <svg
              className="h-5 w-5 animate-spin text-blue-500"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              ></circle>
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
              ></path>
            </svg>
            <span className="text-sm font-medium hidden md:block">
              Uploading & Indexing...
            </span>
          </>
        ) : (
          <>
            <img
              src={uploadlogo}
              alt="upload logo"
              className="w-5 h-7 min-w-5 min-h-7 flex-shrink-0"
            />
            <span className="text-sm font-medium hidden md:block">
              Upload PDF
            </span>
          </>
        )}
      </div>

      {/* Hidden File Input */}
      <input
        type="file"
        accept="application/pdf"
        ref={fileInputRef}
        onChange={handleFileChange}
        style={{ display: "none" }}
      />
    </div>
  );
}

export default UploadPDF;
