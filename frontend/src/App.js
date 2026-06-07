import React, { useCallback, useEffect, useRef, useState } from "react";
import UploadPDF from "./components/UploadPDF";
import AskQuestion from "./components/AskQuestion";
import MarkdownResponse from "./components/MarkdownResponse";
import logo from "./icons/KLP-Logo.svg";
import chatlogo from "./icons/KLP-chat-logo.svg";
import userchatlogo from "./icons/user_chat_logo.svg";
import UploadedPDFList from "./components/UploadedPDFList";
import AuthForm from "./components/AuthForm";
import { ToastContainer, toast } from "react-toastify";
import { api } from "./api";

const createConversationId = () =>
  window.crypto?.randomUUID?.() ||
  `${Date.now()}-${Math.random().toString(36).slice(2)}`;

const getInitialDarkMode = () => {
  const savedTheme = window.localStorage.getItem("pdf-chatter-theme");

  if (savedTheme) {
    return savedTheme === "dark";
  }

  return window.matchMedia?.("(prefers-color-scheme: dark)")?.matches ?? true;
};

export default function App() {
  const [authLoading, setAuthLoading] = useState(true);
  const [isDarkMode, setIsDarkMode] = useState(getInitialDarkMode);
  const [user, setUser] = useState(null);
  const [sessionExpiresAt, setSessionExpiresAt] = useState(null);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", isDarkMode);
    window.localStorage.setItem(
      "pdf-chatter-theme",
      isDarkMode ? "dark" : "light"
    );
  }, [isDarkMode]);

  const toggleTheme = () => {
    setIsDarkMode((previous) => !previous);
  };

  useEffect(() => {
    const restoreSession = async () => {
      try {
        const response = await api.get("/auth/me");
        setUser(response.data);
        setSessionExpiresAt(response.data.expires_at);
        window.history.replaceState({}, "", "/dashboard");
      } catch {
        try {
          const response = await api.post("/auth/refresh");
          setUser(response.data);
          setSessionExpiresAt(response.data.expires_at);
          window.history.replaceState({}, "", "/dashboard");
        } catch {
          setUser(null);
          setSessionExpiresAt(null);
          window.history.replaceState({}, "", "/login");
        }
      } finally {
        setAuthLoading(false);
      }
    };

    restoreSession();
  }, []);

  const handleAuthenticated = (authenticatedUser) => {
    setUser(authenticatedUser);
    setSessionExpiresAt(authenticatedUser.expires_at);
    window.history.replaceState({}, "", "/dashboard");
  };

  const handleLogout = async () => {
    try {
      await api.post("/auth/logout");
      setUser(null);
      setSessionExpiresAt(null);
      window.history.replaceState({}, "", "/login");
      toast.success("You have been logged out.");
    } catch {
      toast.error("Unable to log out. Please try again.");
    }
  };

  useEffect(() => {
    if (!user || !sessionExpiresAt) {
      return undefined;
    }

    const refreshBufferMilliseconds = 60 * 1000;
    const refreshDelay = Math.max(
      1000,
      sessionExpiresAt * 1000 - Date.now() - refreshBufferMilliseconds
    );

    const refreshTimer = window.setTimeout(async () => {
      try {
        const response = await api.post("/auth/refresh");
        setUser(response.data);
        setSessionExpiresAt(response.data.expires_at);
      } catch (error) {
        if (error.response?.status === 401) {
          setUser(null);
          setSessionExpiresAt(null);
          window.history.replaceState({}, "", "/login");
          toast.info("Your session ended. Please log in again.");
        } else {
          setSessionExpiresAt(Math.floor(Date.now() / 1000) + 90);
          toast.error("Unable to renew your session. Retrying shortly.");
        }
      }
    }, refreshDelay);

    return () => window.clearTimeout(refreshTimer);
  }, [sessionExpiresAt, user]);

  const themeToggle = (
    <ThemeToggle isDarkMode={isDarkMode} onToggleTheme={toggleTheme} />
  );
  let appContent;

  if (authLoading) {
    appContent = (
      <div className="app-background flex min-h-screen items-center justify-center px-6">
        <div className="surface-card flex items-center gap-4 px-7 py-5 text-sm font-medium text-slate-600">
          <span className="h-6 w-6 animate-spin rounded-full border-2 border-emerald-600 border-t-transparent" />
          Preparing your workspace
        </div>
      </div>
    );
  } else if (!user) {
    appContent = (
      <AuthForm
        onAuthenticated={handleAuthenticated}
        themeToggle={themeToggle}
      />
    );
  } else {
    appContent = (
      <Dashboard
        user={user}
        onLogout={handleLogout}
        themeToggle={themeToggle}
      />
    );
  }

  return (
    <>
      {appContent}
      <ToastContainer
        position="top-center"
        autoClose={3000}
        hideProgressBar={false}
        newestOnTop={false}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme={isDarkMode ? "dark" : "light"}
      />
    </>
  );
}

function ThemeToggle({ isDarkMode, onToggleTheme }) {
  return (
    <button
      type="button"
      onClick={onToggleTheme}
      className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50"
      aria-label={`Switch to ${isDarkMode ? "light" : "dark"} mode`}
      aria-pressed={isDarkMode}
    >
      {isDarkMode ? (
        <svg viewBox="0 0 24 24" className="h-4 w-4 text-amber-300" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v2" />
          <path d="M12 20v2" />
          <path d="m4.93 4.93 1.41 1.41" />
          <path d="m17.66 17.66 1.41 1.41" />
          <path d="M2 12h2" />
          <path d="M20 12h2" />
          <path d="m6.34 17.66-1.41 1.41" />
          <path d="m19.07 4.93-1.41 1.41" />
        </svg>
      ) : (
        <svg viewBox="0 0 24 24" className="h-4 w-4 text-slate-700" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M20.99 13.7A8 8 0 0 1 10.3 3.01 8.5 8.5 0 1 0 20.99 13.7Z" />
        </svg>
      )}
      <span>{isDarkMode ? "Light mode" : "Dark mode"}</span>
    </button>
  );
}

function Dashboard({ user, onLogout, themeToggle }) {
  const [showLogoutDialog, setShowLogoutDialog] = useState(false);
  const [selectedPDF, setSelectedPDF] = useState(null);
  const [documentId, setDocumentId] = useState(null);
  const [chatHistory, setChatHistory] = useState([]);
  const [conversationId, setConversationId] = useState(createConversationId);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const chatEndRef = useRef(null);

  const handleUploadComplete = useCallback((filename) => {
    setSelectedPDF(filename || null);
    setChatHistory([]);
    setConversationId(createConversationId());
    setRefreshTrigger((prev) => prev + 1);
  }, []);

  const handleDeleteAllComplete = useCallback(() => {
    setDocumentId(null);
    setSelectedPDF(null);
    setRefreshTrigger((prev) => prev + 1);
    setChatHistory([]);
    setConversationId(createConversationId());
  }, []);

  const handleDocumentIdChange = useCallback((id) => {
    setDocumentId(id);
  }, []);

  const handleSelectPDF = useCallback((filename) => {
    setSelectedPDF(filename);
    setChatHistory([]);
    setConversationId(createConversationId());
  }, []);

  const handleUpdateDisplayedText = (text) => {
    setChatHistory((prev) => [
      ...prev,
      { sender: "user", message: text },
      { sender: "ai", message: "Thinking...", isStreaming: true },
    ]);
  };

  const handleAIResponse = (response, isDone = false, sources = []) => {
    setChatHistory((prev) => {
      const updated = [...prev];
      const last = updated[updated.length - 1];

      if (last && last.sender === "ai") {
        updated[updated.length - 1] = {
          ...last,
          message: response || "Thinking...",
          isStreaming: !isDone,
          sources: sources.length > 0 ? sources : last.sources || [],
        };
        return updated;
      }

      return [
        ...updated,
        {
          sender: "ai",
          message: response || "Thinking...",
          isStreaming: !isDone,
          sources,
        },
      ];
    });
  };

  useEffect(() => {
    const validateApiKey = async () => {
      try {
        await api.get("/check-api-key/");
      } catch (error) {
        if (error.response?.status === 400) {
          toast.error(error.response.data.detail);
        }
      }
    };

    validateApiKey();
  }, []);

  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [chatHistory]);

  const selectedLabel = selectedPDF
    ? selectedPDF.replace(/_/g, " ")
    : "Select a document";
  const userInitial = (user.email || "U").charAt(0).toUpperCase();

  return (
    <div className="app-background min-h-screen text-slate-900">
      <header className="sticky top-0 z-20 border-b border-white/60 bg-white/75 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-5 py-4 lg:px-8">
          <div className="flex items-center gap-4">
            <img src={logo} alt="PDF Chatter" className="h-8 w-auto" />
            <span className="hidden rounded-full border border-emerald-100 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 sm:block">
              Knowledge workspace
            </span>
          </div>
          <div className="flex items-center gap-3">
            {themeToggle}
            <div className="hidden text-right sm:block">
              <p className="text-xs text-slate-500">Signed in as</p>
              <p className="max-w-56 truncate text-sm font-medium text-slate-700">
                {user.email}
              </p>
            </div>
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100 text-sm font-bold text-emerald-700">
              {userInitial}
            </span>
            <button
              type="button"
              onClick={() => setShowLogoutDialog(true)}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50"
            >
              Log out
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto grid max-w-7xl gap-5 px-5 py-5 lg:grid-cols-[320px_minmax(0,1fr)] lg:px-8 lg:py-7">
        <aside className="surface-card h-fit p-5 lg:sticky lg:top-24">
          <div className="mb-5">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-emerald-600">
              Library
            </p>
            <h1 className="mt-2 text-xl font-semibold text-slate-900">
              Your documents
            </h1>
            <p className="mt-1 text-sm leading-6 text-slate-500">
              Upload a PDF, then ask questions grounded in its content.
            </p>
          </div>

          <UploadPDF
            onFileUpload={handleDocumentIdChange}
            onUploadComplete={handleUploadComplete}
          />

          <UploadedPDFList
            onSelectPDF={handleSelectPDF}
            onDocumentIdChange={handleDocumentIdChange}
            refreshTrigger={refreshTrigger}
            onallDocsDeleted={handleDeleteAllComplete}
          />
        </aside>

        <section className="surface-card flex min-h-[calc(100vh-130px)] flex-col overflow-hidden">
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4 sm:px-7">
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                Current conversation
              </p>
              <p className="mt-1 truncate text-sm font-medium text-slate-700">
                {selectedLabel}
              </p>
            </div>
            <div
              className={`ml-4 hidden items-center gap-2 rounded-full px-3 py-1.5 text-xs font-medium sm:flex ${
                documentId
                  ? "bg-emerald-50 text-emerald-700"
                  : "bg-slate-100 text-slate-500"
              }`}
            >
              <span
                className={`h-2 w-2 rounded-full ${
                  documentId ? "bg-emerald-500" : "bg-slate-400"
                }`}
              />
              {documentId ? "Ready to chat" : "Waiting for PDF"}
            </div>
          </div>

          <div className="chat-scroll flex-1 overflow-y-auto px-5 py-6 sm:px-7">
            {chatHistory.length === 0 ? (
              <div className="flex h-full min-h-[380px] items-center justify-center">
                <div className="max-w-md text-center">
                  <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-50">
                    <img src={chatlogo} alt="" className="h-10 w-10" />
                  </div>
                  <h2 className="mt-5 text-xl font-semibold text-slate-900">
                    {documentId ? "Start exploring this PDF" : "Choose a PDF to begin"}
                  </h2>
                  <p className="mt-2 text-sm leading-6 text-slate-500">
                    {documentId
                      ? "Ask for a summary, specific facts, or explanations from your selected document."
                      : "Your selected document becomes a searchable conversation once it is uploaded."}
                  </p>
                </div>
              </div>
            ) : (
              <div className="mx-auto max-w-3xl space-y-7">
                {chatHistory.map((chat, index) => (
                  <div
                    key={`${chat.sender}-${index}`}
                    className={`flex items-start gap-3 ${
                      chat.sender === "user" ? "justify-end" : ""
                    }`}
                  >
                    {chat.sender === "ai" && (
                      <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-emerald-50">
                        <img src={chatlogo} alt="Assistant" className="h-7 w-7" />
                      </span>
                    )}

                    <div
                      className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-7 shadow-sm sm:max-w-[78%] ${
                        chat.sender === "user"
                          ? "rounded-tr-md bg-emerald-700 text-white"
                          : "rounded-tl-md border border-slate-100 bg-white text-slate-700"
                      }`}
                    >
                      {chat.sender === "ai" &&
                      chat.isStreaming &&
                      (chat.message === "Thinking..." ||
                        chat.message === "Generating answer...") ? (
                        <div className="flex h-7 items-center gap-1.5">
                          <span className="typing-dot" />
                          <span className="typing-dot typing-delay-1" />
                          <span className="typing-dot typing-delay-2" />
                        </div>
                      ) : (
                        <MarkdownResponse content={chat.message} />
                      )}
                      {chat.sender === "ai" &&
                        chat.isStreaming &&
                        chat.message !== "Thinking..." &&
                        chat.message !== "Generating answer..." && (
                          <span className="streaming-cursor" aria-hidden="true" />
                        )}
                      {chat.sender === "ai" && chat.sources?.length > 0 && (
                        <div className="mt-4 border-t border-slate-100 pt-3">
                          <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.15em] text-emerald-700">
                            Sources
                          </p>
                          <div className="space-y-2">
                            {chat.sources.map((source, sourceIndex) => (
                              <div
                                key={`${source.filename}-${source.page_number || "document"}-${sourceIndex}`}
                                className="rounded-xl bg-emerald-50/70 px-3 py-2.5 text-xs leading-5 text-slate-600"
                              >
                                <p className="font-semibold text-emerald-800">
                                  {source.filename}
                                  {source.page_number ? ` - Page ${source.page_number}` : ""}
                                </p>
                                <p className="mt-1 text-slate-600">{source.excerpt}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    {chat.sender === "user" && (
                      <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-slate-100">
                        <img src={userchatlogo} alt="You" className="h-7 w-7" />
                      </span>
                    )}
                  </div>
                ))}
                <div ref={chatEndRef} />
              </div>
            )}
          </div>

          <div className="border-t border-slate-100 bg-white/70 p-4 sm:p-6">
            <AskQuestion
              onSend={handleUpdateDisplayedText}
              documentId={documentId}
              conversationId={conversationId}
              onReceiveResponse={handleAIResponse}
            />
          </div>
        </section>
      </main>

      {showLogoutDialog && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="logout-dialog-title"
        >
          <div className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-2xl shadow-slate-900/20">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-50 text-rose-600">
              <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <path d="m16 17 5-5-5-5" />
                <path d="M21 12H9" />
              </svg>
            </div>
            <h2 id="logout-dialog-title" className="mt-5 text-xl font-semibold text-slate-900">
              Log out of your workspace?
            </h2>
            <p className="mt-2 text-sm leading-6 text-slate-500">
              Your session will end on this device. Log in again whenever you are ready to return.
            </p>
            <div className="mt-7 flex gap-3">
              <button
                type="button"
                onClick={() => setShowLogoutDialog(false)}
                className="flex-1 rounded-xl border border-slate-200 px-4 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
              >
                Keep working
              </button>
              <button
                type="button"
                onClick={onLogout}
                className="flex-1 rounded-xl bg-rose-600 px-4 py-3 text-sm font-medium text-white transition hover:bg-rose-700"
              >
                Log out
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
