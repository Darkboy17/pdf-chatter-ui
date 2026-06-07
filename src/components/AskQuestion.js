import React, { useRef, useState } from "react";

const AskQuestion = ({ onSend, documentId, conversationId, onReceiveResponse }) => {
  const [inputText, setInputText] = useState("");
  const [isSending, setIsSending] = useState(false);
  const activeRequestRef = useRef(null);

  const handleSend = async (text) => {
    const question = text.trim();
    if (!question || !documentId || isSending) {
      return;
    }

    onSend(question);
    setInputText("");
    setIsSending(true);
    const controller = new AbortController();
    activeRequestRef.current = controller;
    let accumulatedText = "";
    let accumulatedSources = [];

    try {
      const response = await fetch(`${window.backendURL}/ask-question/`, {
        method: "POST",
        credentials: "include",
        signal: controller.signal,
        headers: {
          "Content-Type": "application/json",
          Accept: "text/event-stream",
        },
        body: JSON.stringify({
          question,
          document_id: documentId.toString(),
          conversation_id: conversationId,
        }),
      });

      if (!response.ok || !response.body) {
        throw new Error("Failed to retrieve an answer.");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder("utf-8");
      let eventBuffer = "";
      let isComplete = false;

      while (!isComplete) {
        const { value, done } = await reader.read();
        if (done) {
          break;
        }

        eventBuffer += decoder.decode(value, { stream: true });
        eventBuffer = eventBuffer.replace(/\r\n/g, "\n");

        let eventBoundary = eventBuffer.indexOf("\n\n");
        while (eventBoundary !== -1) {
          const rawEvent = eventBuffer.slice(0, eventBoundary);
          eventBuffer = eventBuffer.slice(eventBoundary + 2);

          let eventName = "message";
          const dataLines = [];
          rawEvent.split("\n").forEach((line) => {
            if (line.startsWith("event:")) {
              eventName = line.slice(6).trim();
            } else if (line.startsWith("data:")) {
              dataLines.push(line.slice(5).trimStart());
            }
          });

          if (dataLines.length > 0) {
            const payload = JSON.parse(dataLines.join("\n"));

            if (eventName === "start") {
              onReceiveResponse("Generating answer...", false, []);
            } else if (eventName === "delta") {
              accumulatedText += payload.delta || "";
              onReceiveResponse(accumulatedText, false, accumulatedSources);
            } else if (eventName === "sources") {
              accumulatedSources = payload.sources || [];
              onReceiveResponse(accumulatedText, false, accumulatedSources);
            } else if (eventName === "done") {
              isComplete = true;
              onReceiveResponse(accumulatedText, true, accumulatedSources);
            } else if (eventName === "error") {
              throw new Error(payload.message || "The response stream failed.");
            }
          }

          eventBoundary = eventBuffer.indexOf("\n\n");
        }
      }

      if (!isComplete) {
        onReceiveResponse(accumulatedText, true, accumulatedSources);
      }
    } catch (error) {
      if (error.name === "AbortError") {
        onReceiveResponse(accumulatedText, true, accumulatedSources);
      } else {
        console.error("Streaming failed", error);
        onReceiveResponse(
          accumulatedText || "I could not generate an answer right now. Please try again.",
          true,
          accumulatedSources
        );
      }
    } finally {
      activeRequestRef.current = null;
      setIsSending(false);
    }
  };

  const stopGenerating = () => {
    activeRequestRef.current?.abort();
  };

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        handleSend(inputText);
      }}
      className="mx-auto max-w-3xl"
    >
      <div className="flex items-end gap-3 rounded-2xl border border-slate-200 bg-white p-2.5 shadow-sm transition focus-within:border-emerald-300 focus-within:ring-4 focus-within:ring-emerald-50">
        <textarea
          disabled={!documentId || isSending}
          value={inputText}
          onChange={(event) => setInputText(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              handleSend(inputText);
            }
          }}
          placeholder={
            documentId
              ? "Ask a question about your document..."
              : "Select or upload a PDF to start chatting"
          }
          rows={1}
          className="min-h-[46px] flex-1 resize-none bg-transparent px-3 py-3 text-sm text-slate-700 outline-none placeholder:text-slate-400 disabled:cursor-not-allowed"
        />
        <button
          type={isSending ? "button" : "submit"}
          onClick={isSending ? stopGenerating : undefined}
          className={`flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl text-white transition disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400 ${
            isSending ? "bg-slate-800 hover:bg-slate-900" : "bg-emerald-700 hover:bg-emerald-800"
          }`}
          disabled={!isSending && (!documentId || !inputText.trim())}
          aria-label={isSending ? "Stop generating" : "Send question"}
        >
          {isSending ? (
            <span className="h-3.5 w-3.5 rounded-sm bg-white" />
          ) : (
            <svg width="19" height="18" viewBox="0 0 19 18" fill="none" stroke="currentColor" strokeWidth="1.7">
              <path d="M17.5 9 1.5 16l3-7-3-7 16 7Z" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M17 9H4.5" strokeLinecap="round" />
            </svg>
          )}
        </button>
      </div>
      <p className="mt-2.5 text-center text-xs text-slate-400">
        {isSending
          ? "Generating answer. Select stop to end the response."
          : documentId
            ? "Press Enter to send. Shift + Enter adds a new line."
            : "Upload a document to unlock questions."}
      </p>
    </form>
  );
};

export default AskQuestion;
