import React, { useCallback, useEffect, useRef, useState } from "react";
import pdflogo from "../icons/pdf_logo.svg";
import { toast } from "react-toastify";
import { api } from "../api";

function UploadedPDFList({
  onSelectPDF = () => {},
  onDocumentIdChange,
  refreshTrigger,
  onallDocsDeleted,
}) {
  const [pdfFiles, setPdfFiles] = useState([]);
  const [selectedPDF, setSelectedPDF] = useState(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const [loading, setLoading] = useState(false);
  const [pendingDeletePDF, setPendingDeletePDF] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const dropdownRef = useRef(null);

  const handleSelectPDF = useCallback(
    async (filename) => {
      setSelectedPDF(filename);
      setShowDropdown(false);
      onSelectPDF(filename);

      try {
        const response = await api.get("/get-document-id/", {
          params: { filename },
        });
        onDocumentIdChange(response.data.document_id);
      } catch (error) {
        toast.error(error.response?.data?.detail || "Unable to open this PDF.");
      }
    },
    [onDocumentIdChange, onSelectPDF]
  );

  const handleRequestDelete = (filename, event) => {
    event.stopPropagation();
    setPendingDeletePDF(filename);
  };

  const handleDelete = async () => {
    if (!pendingDeletePDF || deleting) {
      return;
    }

    const filename = pendingDeletePDF;
    setDeleting(true);
    try {
      const idResponse = await api.get("/get-document-id/", {
        params: { filename },
      });
      const response = await api.delete(`/delete-pdf/${idResponse.data.document_id}`);
      const remainingFiles = pdfFiles.filter((file) => file !== filename);

      setPdfFiles(remainingFiles);
      toast.success(response.data.message);

      if (remainingFiles.length === 0) {
        setSelectedPDF(null);
        setShowDropdown(false);
        setPendingDeletePDF(null);
        if (onallDocsDeleted) {
          onallDocsDeleted();
        }
      } else if (selectedPDF === filename) {
        setPendingDeletePDF(null);
        await handleSelectPDF(remainingFiles[remainingFiles.length - 1]);
      } else {
        setPendingDeletePDF(null);
      }
    } catch (error) {
      toast.error(error.response?.data?.detail || "Error deleting PDF.");
    } finally {
      setDeleting(false);
    }
  };

  const fetchPDFs = useCallback(async () => {
    setLoading(true);
    try {
      const response = await api.get("/list-uploads/");
      const files = Array.isArray(response.data) ? response.data : [];
      setPdfFiles(files);

      if (files.length > 0) {
        await handleSelectPDF(files[files.length - 1]);
      } else {
        setSelectedPDF(null);
      }
    } catch (error) {
      toast.info("Upload a PDF file to begin chatting.");
    } finally {
      setLoading(false);
    }
  }, [handleSelectPDF]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    fetchPDFs();
  }, [fetchPDFs, refreshTrigger]);

  return (
    <div className="mt-6 border-t border-slate-100 pt-5" ref={dropdownRef}>
      <div className="mb-3 flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
          Active PDF
        </p>
        {!loading && pdfFiles.length > 0 && (
          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-500">
            {pdfFiles.length}
          </span>
        )}
      </div>

      {loading ? (
        <div className="flex items-center gap-3 rounded-xl border border-slate-100 bg-slate-50 p-4 text-sm text-slate-500">
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-emerald-600 border-t-transparent" />
          Loading documents
        </div>
      ) : pdfFiles.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/70 p-4 text-sm leading-6 text-slate-500">
          No PDF files uploaded yet.
        </div>
      ) : (
        <div className="relative">
          <button
            type="button"
            onClick={() => setShowDropdown((previous) => !previous)}
            className="flex w-full items-center gap-3 rounded-xl border border-slate-200 bg-white p-3 text-left transition hover:border-emerald-200 hover:bg-emerald-50/40"
            aria-expanded={showDropdown}
            aria-haspopup="listbox"
          >
            <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-rose-50">
              <img src={pdflogo} alt="" className="h-6 w-6" />
            </span>
            <span className="min-w-0 flex-1 truncate text-sm font-medium text-slate-700">
              {selectedPDF?.replace(/_/g, " ")}
            </span>
            <svg viewBox="0 0 20 20" className="h-4 w-4 flex-shrink-0 text-slate-400" fill="currentColor">
              <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 0 1 1.06.02L10 11.17l3.71-3.94a.75.75 0 1 1 1.08 1.04l-4.25 4.5a.75.75 0 0 1-1.08 0l-4.25-4.5a.75.75 0 0 1 .02-1.06Z" clipRule="evenodd" />
            </svg>
          </button>

          {showDropdown && (
            <div
              className="absolute left-0 right-0 top-full z-30 mt-2 max-h-72 overflow-y-auto rounded-xl border border-slate-100 bg-white p-2 shadow-xl shadow-slate-900/10"
              role="listbox"
            >
              {pdfFiles.map((filename) => (
                <div
                  key={filename}
                  className={`group flex items-center gap-2 rounded-lg px-2 py-2 transition ${
                    selectedPDF === filename ? "bg-emerald-50" : "hover:bg-slate-50"
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => handleSelectPDF(filename)}
                    className="min-w-0 flex-1 truncate px-2 py-1 text-left text-sm text-slate-700"
                    role="option"
                    aria-selected={selectedPDF === filename}
                  >
                    {filename.replace(/_/g, " ")}
                  </button>
                  <button
                    type="button"
                    onClick={(event) => handleRequestDelete(filename, event)}
                    className="rounded-lg px-2 py-1 text-xs font-medium text-slate-400 transition hover:bg-rose-50 hover:text-rose-600"
                    aria-label={`Delete ${filename}`}
                  >
                    Delete
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {pendingDeletePDF && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-sm"
          role="alertdialog"
          aria-modal="true"
          aria-labelledby="delete-pdf-dialog-title"
          aria-describedby="delete-pdf-dialog-description"
        >
          <div className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-2xl shadow-slate-900/20">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-50 text-rose-600">
              <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M3 6h18" />
                <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
                <path d="M10 11v6" />
                <path d="M14 11v6" />
              </svg>
            </div>
            <h2 id="delete-pdf-dialog-title" className="mt-5 text-xl font-semibold text-slate-900">
              Delete this PDF?
            </h2>
            <p id="delete-pdf-dialog-description" className="mt-2 text-sm leading-6 text-slate-500">
              This will remove{" "}
              <span className="font-medium text-slate-700">
                {pendingDeletePDF.replace(/_/g, " ")}
              </span>{" "}
              from your uploaded documents.
            </p>
            <div className="mt-7 flex gap-3">
              <button
                type="button"
                onClick={() => setPendingDeletePDF(null)}
                disabled={deleting}
                className="flex-1 rounded-xl border border-slate-200 px-4 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={deleting}
                className="flex-1 rounded-xl bg-rose-600 px-4 py-3 text-sm font-medium text-white transition hover:bg-rose-700 disabled:cursor-wait disabled:opacity-70"
              >
                {deleting ? "Deleting..." : "Delete PDF"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default UploadedPDFList;
