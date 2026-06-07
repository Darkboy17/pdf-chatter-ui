import React, { useState } from "react";
import logo from "../icons/KLP-Logo.svg";
import { api } from "../api";

function AuthForm({ onAuthenticated, themeToggle }) {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const chooseMode = (signUp) => {
    setIsSignUp(signUp);
    setConfirmPassword("");
    setError("");
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");

    if (isSignUp && password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setSubmitting(true);
    try {
      const action = isSignUp ? "signup" : "login";
      await api.post(`/auth/${action}`, { email, password });
      const sessionResponse = await api.get("/auth/me");
      onAuthenticated(sessionResponse.data);
    } catch (authError) {
      const detail = authError.response?.data?.detail;
      setError(
        typeof detail === "string"
          ? detail
          : "We could not complete authentication. Please try again."
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="auth-background min-h-screen p-4 sm:p-7">
      <div className="mx-auto grid min-h-[calc(100vh-3.5rem)] max-w-6xl overflow-hidden rounded-[2rem] bg-white shadow-2xl shadow-slate-900/10 lg:grid-cols-[1.02fr_0.98fr]">
        <section className="auth-showcase hidden flex-col justify-between p-10 text-white lg:flex">
          <img src={logo} alt="PDF Chatter" className="h-10 w-fit brightness-0 invert" />
          <div>
            <span className="inline-flex rounded-full border border-white/20 bg-white/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-emerald-100">
              AI document workspace
            </span>
            <h1 className="mt-7 max-w-md text-5xl font-semibold leading-tight tracking-tight">
              Understand every PDF with clarity.
            </h1>
            <p className="mt-5 max-w-md text-base leading-7 text-emerald-50/80">
              Upload documents, ask precise questions, and keep your research conversations in one focused workspace.
            </p>
          </div>
          <div className="grid grid-cols-3 gap-3 text-sm">
            {["Secure session", "PDF insights", "Fast answers"].map((benefit) => (
              <div key={benefit} className="rounded-2xl border border-white/15 bg-white/10 p-3 text-emerald-50">
                {benefit}
              </div>
            ))}
          </div>
        </section>

        <section className="flex items-center justify-center px-6 py-10 sm:px-12 lg:px-14">
          <div className="w-full max-w-md">
            <div className="mb-10 flex items-center justify-between gap-4">
              <img src={logo} alt="PDF Chatter" className="h-9 w-auto lg:hidden" />
              <span className="hidden lg:block" />
              {themeToggle}
            </div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-600">
              Welcome to PDF Chatter
            </p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight text-slate-900">
              {isSignUp ? "Create your account" : "Sign in to continue"}
            </h2>
            <p className="mt-3 text-sm leading-6 text-slate-500">
              {isSignUp
                ? "Create a secure account and begin asking questions from your PDFs."
                : "Return to your documents and continue the conversation."}
            </p>

            <div className="mt-8 grid grid-cols-2 rounded-xl bg-slate-100 p-1.5">
              <button
                type="button"
                onClick={() => chooseMode(false)}
                className={`rounded-lg py-2.5 text-sm font-medium transition ${
                  !isSignUp ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"
                }`}
              >
                Log in
              </button>
              <button
                type="button"
                onClick={() => chooseMode(true)}
                className={`rounded-lg py-2.5 text-sm font-medium transition ${
                  isSignUp ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"
                }`}
              >
                Sign up
              </button>
            </div>

            <form onSubmit={handleSubmit} className="mt-7 space-y-5">
              <label className="block text-sm font-medium text-slate-700">
                Email address
                <input
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="you@example.com"
                  className="form-input mt-2"
                />
              </label>
              <label className="block text-sm font-medium text-slate-700">
                Password
                <input
                  type="password"
                  required
                  minLength={6}
                  autoComplete={isSignUp ? "new-password" : "current-password"}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="Minimum 6 characters"
                  className="form-input mt-2"
                />
              </label>
              {isSignUp && (
                <label className="block text-sm font-medium text-slate-700">
                  Confirm password
                  <input
                    type="password"
                    required
                    minLength={6}
                    autoComplete="new-password"
                    value={confirmPassword}
                    onChange={(event) => setConfirmPassword(event.target.value)}
                    placeholder="Repeat your password"
                    className="form-input mt-2"
                  />
                </label>
              )}

              {error && (
                <p role="alert" className="rounded-xl border border-rose-100 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={submitting}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-700 py-3.5 text-sm font-semibold text-white shadow-lg shadow-emerald-700/20 transition hover:bg-emerald-800 disabled:cursor-wait disabled:opacity-70"
              >
                {submitting && (
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/50 border-t-white" />
                )}
                {submitting ? "Authenticating..." : isSignUp ? "Create account" : "Log in securely"}
              </button>
            </form>

            <p className="mt-7 text-center text-xs leading-5 text-slate-400">
              Your authentication session is securely managed by the application server.
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}

export default AuthForm;
