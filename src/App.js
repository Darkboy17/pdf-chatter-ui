import React, { useState, useEffect, useRef } from "react";
import ReactMarkdown from "react-markdown";
import UploadPDF from "./components/UploadPDF";
import AskQuestion from "./components/AskQuestion";
import logo from "./icons/AI-Planet-Logo.svg";
import chatlogo from "./icons/ai_chat_logo.svg";
import userchatlogo from "./icons/user_chat_logo.svg";
import UploadedPDFList from "./components/UploadedPDFList";
import { toast } from "react-toastify";
import axios from "axios";

import { backendURL } from '../src/config';

export default function App() {

  // State variables

  // for storing the currently selected PDF
  const [selectedPDF, setSelectedPDF] = useState(null);

  // Document ID for the currently selected PDF
  const [documentId, setDocumentId] = useState(null);

  // Array to store chat history
  const [chatHistory, setChatHistory] = useState([]);

  // Trigger for refreshing the PDF list
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Ref for auto-scrolling chat container
  const chatEndRef = useRef(null); // Create a ref for auto-scrolling

  // Handle upload completion
  const handleUploadComplete = (filename) => {
    setRefreshTrigger((prev) => prev + 1);
  };

  // Handle deletion of all documents
  const handleDeleteAllComplete = (filename) => {
    setDocumentId(null);
    setRefreshTrigger((prev) => prev + 1);
    setChatHistory([]);
  };

  // Handle change in document ID when selecting existing PDFs
  const handleDocumentIdChange = (id) => {
    setDocumentId(id);
    setSelectedPDF(null);
  };

  // Update displayed text when user sends a message
  const handleUpdateDisplayedText = (text) => {
    // setuserMessage(text);
    // Add the user's message to chat history
    setChatHistory((prevHistory) => [
      ...prevHistory,
      { sender: "user", message: text },
    ]);
  };

  // Hnadle currently selected PDF
  const handleSelectPDF = (filename) => {
    setSelectedPDF(filename); // Update the selected file in the parent component
    // Perform any other actions you need with the selected file
    setChatHistory([]);
  };

  // Handle AI response
  const handleAIResponse = (response) => {

    // Append the AI's response as a new entry in chat history
    setChatHistory((prevHistory) => [
      ...prevHistory,
      { sender: "ai", message: response },
    ]);
  };

  useEffect(() => {

    const api_response = async () => {

      try {

        await axios.get(`${backendURL}/check-api-key`);
        //toast.success(response.data.message);

      } catch (error) {

        if (error.response && error.response.status === 400) {
          toast.error(error.response.data.detail);
        }

      }
    };

    api_response();
  }, []);

  // Effect to scroll chat container to bottom
  useEffect(() => {
    // Clear chat history when a new PDF is selected or uploaded
    setChatHistory([]);
    setSelectedPDF();
  }, [selectedPDF, documentId]);

  // Effect to clear chat history when PDF selection changes
  useEffect(() => {
    // Scroll to the bottom whenever chatHistory changes
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [chatHistory]);

  return (
    <div className="overflow-hidden w-screen h-screen bg-gray-100 flex flex-col items-center">
      {/* Header */}
      <header className="w-full h-18 max-h-18 overflow-hidden py-4 bg-white shadow-md flex items-center px-4 md:px-10 ">
        {/* Logo */}
        <div className="flex items-center space-x-2 flex-shrink-0">
          <img src={logo} alt="AIP Logo" className="h-8 md:h-9" />
        </div>

        {/* Spacer to push content to the right */}
        <div className="flex-grow"></div>

        {/* PDF Display */}
        <div className="flex space-x-2 items-center">
          <UploadedPDFList
            onSelectPDF={handleSelectPDF}
            onDocumentIdChange={handleDocumentIdChange}
            refreshTrigger={refreshTrigger}
            onallDocsDeleted={handleDeleteAllComplete}
          />
          <UploadPDF
            onFileUpload={handleDocumentIdChange}
            onUploadComplete={handleUploadComplete}
          />
        </div>
      </header>

      {/* Content Container */}
      <main className=" sm:p-0 w-full h-full mt-4 p-4 md:p-8 lg:p-10 rounded-lg shadow-lg flex flex-col justify-between">
        {/* Chat Section */}
        <div className="h-[320px] md:h-[440px] mt-10 flex-grow overflow-y-auto ">
          <div className="bg-gray-50 rounded-md p-3 md:p-4 space-y-3 md:space-y-4">
            {/* Render chat history */}
            {chatHistory.map((chat, index) => (
              <div key={index} className="flex items-start space-x-3">
                {/* Display user or AI logo */}
                {chat.sender === "user" ? (
                  <img
                    src={userchatlogo}
                    alt="User"
                    className="h-8 w-8 md:h-8 md:w-8"
                  />
                ) : (
                  <img
                    src={chatlogo}
                    alt="AI Planet"
                    className="h-8 w-8 md:h-8 md:w-8"
                  />
                )}
                {/* Display message */}
                <div className="p-1 rounded-md mb-5 md:mb-7 text-xs sm:text-sm md:text-sm">
                  <ReactMarkdown
                    components={{
                      p: ({ node, ...props }) => (
                        <p style={{ marginBottom: "0.75rem" }} {...props} />
                      ),
                    }}
                  >
                    {chat.message}
                  </ReactMarkdown>
                </div>
              </div>
            ))}
            <div ref={chatEndRef} /> {/* Ref to scroll to the bottom */}
          </div>
        </div>

        {/* MessageInput at the bottom */}
        <div className="mt-2 w-full">
          <AskQuestion
            onSend={handleUpdateDisplayedText}
            documentId={documentId}
            onReceiveResponse={handleAIResponse}
          />
        </div>
      </main>
    </div>
  );
}