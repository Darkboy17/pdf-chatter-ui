import React, { useState } from "react";
import axios from "axios";

const AskQuestion = ({ onSend, documentId, onReceiveResponse }) => {

  // URL of the backend API hosted on the cloud
  const backendURL = "https://darkboy18-myimage.sliplane.app"

  // State variable to store user input
  const [inputText, setInputText] = useState("");

  // Function to handle sending the question
  const handleSend = async () => {
    // Update displayedText with inputText when the "Send" button is clicked
    onSend(inputText);

    setInputText(""); // Clear the chatbox input

    try {
      const response = await axios.post(`${backendURL}/ask-question/`, {
        question: inputText,
        document_id: documentId !== null ? documentId.toString() : "",
      });

      const AIResponse = response.data;

      onReceiveResponse(AIResponse); // Pass AIResponse up to App.js
    } catch (error) {
      console.error("Failed to send question", error);
    }
  };

  // Function to handle key presses in the input box
  const handleKeyDown = (e) => {
    if (e.key === "Enter") {
      if (e.shiftKey) {

        // Shift + Enter adds a new line
        e.preventDefault();

        const currentText = inputText;

        setInputText(currentText + "\n");

      } else {

        // Enter alone sends the message
        e.preventDefault(); // Prevent new line on Enter

        handleSend();

      }
    }
  };

  // Function to handle input changes
  const handleInputChange = (e) => {
    setInputText(e.target.value);
  };

  return (
    <div className="flex items-center p-1 border rounded-lg shadow-sm w-full max-w bg-white">
      <input
        disabled={!documentId} // Disable when no PDF uploaded
        type="text"
        value={inputText}
        onChange={handleInputChange}
        onKeyDown={handleKeyDown} // Listen for Enter key
        placeholder="Chat with PDF here..."
        className="flex-1 px-4 py-2 text-sm text-gray-700 bg-transparent border-none outline-none  resize-none over"
      />

      <button
        onClick={handleSend}
        className={`p-2 ${
          documentId && inputText.trim()
            ? "text-gray-500 hover:text-blue-500"
            : "text-gray-300 cursor-not-allowed"
        }`}
        disabled={!documentId || !inputText.trim()} // Disable if input is empty or whitespace or Disable button when no PDF uploaded
      >
        <svg
          width="19"
          height="16"
          viewBox="0 0 19 16"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M18.1667 7.99999L0.75 15.3333L4.01608 7.99999L0.75 0.666656L18.1667 7.99999ZM18.1667 7.99999H3.95833"
            stroke="#222222"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>
    </div>
  );
};

export default AskQuestion;
