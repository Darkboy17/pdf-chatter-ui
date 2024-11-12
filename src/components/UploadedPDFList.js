import React, { useEffect, useState, useRef } from "react";
import axios from "axios";
import pdflogo from "../icons/pdf_logo.svg";
import { toast } from "react-toastify";

function UploadedPDFList({
  onDocumentIdChange,
  refreshTrigger,
  onallDocsDeleted,
}) {

  // URL of the backend API hosted on the cloud
  const backendURL = "https://darkboy18-pdf-chatter.sliplane.app"

  // State variables
  const [pdfFiles, setPdfFiles] = useState([]);
  const [selectedPDF, setSelectedPDF] = useState();
  const [showDropdown, setShowDropdown] = useState(false);
  const [loading, setLoading] = useState(false);

  const [documentID, setdocumentID] = useState(null);

  // Ref for dropdown element to be used for closing of the PDF list
  const dropdownRef = useRef(null);

  // Function to handle PDF deletion
  const handleDelete = (filename, event) => {

    event.stopPropagation(); // Prevent triggering handleSelectPDF

    setPdfFiles((prevFiles) => {
      const pdfFiles = prevFiles.filter((file) => file !== filename);

      // Clear selectedPDF if no files are left
      if (pdfFiles.length === 0) {

        setSelectedPDF(null);

        // Use setTimeout to defer onallDocsDeleted call
        if (onallDocsDeleted) {
          setTimeout(() => onallDocsDeleted(), 3500);
        }
      }

      return pdfFiles;
    });

    handleDeletePDF(documentID);
  };

  // Fetch existing PDFs from the database
  const fetchPDFs = async () => {

    setLoading(true); // Start loading

    try {

      const response = await axios.get(`${backendURL}/list-uploads/`);

      setPdfFiles(response.data); // Assuming response data is an array of file names

      if (response.data.length > 0) {

        const lastPDF = response.data[response.data.length - 1];

        setSelectedPDF(lastPDF); // Set the last PDF as selected

        handleSelectPDF(lastPDF); // Automatically select the last PDF

      }
    } catch (error) {

      toast.info(
        "No existing PDFs exists. Please upload a PDF file to start chatting."
      );

    } finally {

      // Show spinner for n seconds, then show the selected PDF
      const timer = setTimeout(() => setLoading(false), 0);

      return () => clearTimeout(timer); // Clean up the timer on component unmount

    }
  };

  // Function to handle PDF deletion again for more readability
  const handleDeletePDF = async (documentId) => {

    //setDeletingFile(documentId);

    try {

      // Make an API call to delete the PDF and its index by document ID
      const response = await axios.delete(
        `${backendURL}/delete-pdf/${documentId}`
      );

      toast.success(response.data.message);

    } catch (error) {

      toast.error("Error deleting PDF:", error);

    } finally {


      if (pdfFiles.length === 0) setSelectedPDF(null);

    }
  };

  // Toggle dropdown visibility
  const handlePDFClick = () => {

    setShowDropdown((prev) => !prev); // Toggle the dropdown visibility

  };

  // Handle selection of a PDF
  const handleSelectPDF = async (filename) => {

    setSelectedPDF(filename); // Set the clicked file as the selected file

    setShowDropdown(false); // Close the dropdown

    // Fetch document_id for the selected PDF
    try {

      const response = await axios.get(
        `${backendURL}/get-document-id/`,
        {
          params: { filename },
        }
      );

      setdocumentID(response.data.document_id);

      onDocumentIdChange(response.data.document_id); // Pass document_id to parent

    } catch (error) {

      console.error("Failed to fetch document ID", error);

    }
  };

  // Close dropdown if clicked outside
  const handleClickOutside = (event) => {
    if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
      setShowDropdown(false);
    }
  };

  // Effect to clear selected PDF when PDF list changes
  useEffect(() => {
    if (pdfFiles.length === 0 && selectedPDF !== null) {
      setSelectedPDF(null); // Clear selected PDF if no files remain

      if (onallDocsDeleted) onallDocsDeleted(); // Notify parent only when pdfFiles is empty
    }
  }, [pdfFiles, selectedPDF, onallDocsDeleted]);

  // Add event listener for clicking outside the pdf list
  useEffect(() => {
    document.addEventListener("mousedown", handleClickOutside);

    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Refresh PDF list when refreshTrigger changes
  useEffect(() => {
    if (refreshTrigger !== 0) {
      fetchPDFs();
      refreshTrigger = 0; // Reset the trigger after fetching
    }
  }, [refreshTrigger]);

  return (
    <div className="relative">
      <div className="mr-8 flex">
        {selectedPDF && (
          <img
            src={pdflogo}
            alt="AIP Logo"
            className="h-6 w-6 mt-2 md:mt-1 mx-5"
          />
        )}
        <span
          onClick={handlePDFClick}
          className="text-green-600  py-1 rounded-full text-xs sm:text-sm font-medium cursor-pointer"
        >
          {loading ? (
            <svg
              className="h-5 w-5 animate-spin text-green-500"
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
          ) : (
            selectedPDF
          )}
        </span>
      </div>

      {/* Custom dropdown */}
      {showDropdown && (
        <div
          ref={dropdownRef}
          className="fixed text-xs md:text-sm mt-2 w-60 md:w-auto overflow-y-auto max-h-96 bg-white border border-gray-300 rounded-lg shadow-lg z-50"
        >
          {pdfFiles.map((filename, index) => (
            <div
              key={index}
              onClick={() => handleSelectPDF(filename)}
              className="border-2 border-gray-100 p-3 flex items-center justify-between px-4 py-2 hover:bg-teal-100 cursor-pointer transition duration-500 ease-in-out"
            >
              {/* Filename */}
              <div className="flex w-full items-center">
                <span className="">{filename}</span>
              </div>

              {/* Delete Icon */}
              <button
                onClick={(event) => handleDelete(filename, event)}
                className={`text-red-500 hover:bg-red-400 hover:text-white flex mx-4 border-2 border-gray-100 p-1 `}
              >
                Delete
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default UploadedPDFList;
