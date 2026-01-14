"use client";
import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles } from "lucide-react";

import { sendVerificationCode, resetPasswordWithCode } from "@/lib/api";
import { Loading } from '@/components/common/loading';
function getPasswordStrength(password: string): number {
  let score = 0;
  if (password.length >= 8) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[a-z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;
  return score;
}
const strengthLabels = ["Too weak", "Weak", "Fair", "Good", "Strong"];
interface OTPInputProps {
  value: string;
  onChange: (val: string) => void;
  length?: number;
  disabled?: boolean;
}
function OTPInput({ value, onChange, length = 6, disabled }: OTPInputProps) {
  const inputs = useRef<Array<HTMLInputElement | null>>([]);
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>, idx: number) => {
    const val = e.target.value.replace(/\D/g, "");
    if (!val) return;
    const arr = value.split("");
    arr[idx] = val[val.length - 1];
    for (let i = 1; i < val.length; i++) {
      if (idx + i < length) arr[idx + i] = val[i];
    }
    const joined = arr.join("").slice(0, length);
    onChange(joined);
    if (val.length > 0 && idx < length - 1 && joined.length < length) {
      inputs.current[idx + 1]?.focus();
    }
  };
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, idx: number) => {
    if (e.key === "Backspace") {
      if (value[idx]) {
        const arr = value.split("");
        arr[idx] = "";
        onChange(arr.join(""));
      } else if (idx > 0) {
        inputs.current[idx - 1]?.focus();
        const arr = value.split("");
        arr[idx - 1] = "";
        onChange(arr.join(""));
      }
    }
  };
  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    const pasted = e.clipboardData.getData("Text").replace(/\D/g, "").slice(0, length);
    if (pasted) {
      onChange(pasted);
      setTimeout(() => {
        if (inputs.current[pasted.length - 1]) {
          inputs.current[pasted.length - 1]?.focus();
        }
      }, 0);
    }
    e.preventDefault();
  };
  return (
    <div className="flex gap-2 flex-nowrap justify-center w-full">
      {Array.from({ length }).map((_, idx) => (
        <input
          key={idx}
          ref={el => { inputs.current[idx] = el; }}
          type="text"
          inputMode="numeric"
          maxLength={1}
          value={value[idx] || ""}
          onChange={e => handleChange(e, idx)}
          onKeyDown={e => handleKeyDown(e, idx)}
          onPaste={handlePaste}
          className={`w-12 h-12 text-center text-xl border rounded-md shadow transition-all focus:ring-2 focus:ring-brand-blue-400 outline-none ${value[idx] ? "bg-brand-blue-50 border-brand-blue-400" : "bg-white border-brand-gray-300"} ${disabled ? "opacity-60" : ""}`}
          disabled={disabled}
          autoFocus={idx === 0}
        />
      ))}
    </div>
  );
}

export default function ForgotPasswordPage() {
  // ...existing code...
  // (move this block after error/success state declarations)
  const [resendLoading, setResendLoading] = useState<boolean>(false);
  const [email, setEmail] = useState<string>("");
  const [verificationCode, setVerificationCode] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [confirm, setConfirm] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const OTP_VALIDITY_SECONDS = 900; // 15 minutes
  const RESEND_SECONDS = 60; // 1 minute
  const [timer, setTimer] = useState<number>(RESEND_SECONDS);
  const [otpValidTimer, setOtpValidTimer] = useState<number>(OTP_VALIDITY_SECONDS);
  const [canResend, setCanResend] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Auto-dismiss error/success messages after 3 seconds
  useEffect(() => {
    if (error || success) {
      const t = setTimeout(() => {
        setError(null);
        setSuccess(null);
      }, 3000);
      return () => clearTimeout(t);
    }
  }, [error, success]);
  const [showVerificationStep, setShowVerificationStep] = useState<boolean>(false);
  // Resend Verification Code timer
  useEffect(() => {
    if (showVerificationStep && timer > 0) {
      const t = setTimeout(() => setTimer(timer - 1), 1000);
      return () => clearTimeout(t);
    }
    if (timer === 0) setCanResend(true);
  }, [timer, showVerificationStep]);

  // Verification Code validity timer and redirect on expiry
  useEffect(() => {
    if (showVerificationStep && otpValidTimer > 0) {
      const t = setTimeout(() => setOtpValidTimer(otpValidTimer - 1), 1000);
      return () => clearTimeout(t);
    }
    if (showVerificationStep && otpValidTimer === 0) {
      window.location.href = "/login";
    }
  }, [otpValidTimer, showVerificationStep]);
  const handleResend = async () => {
    setResendLoading(true);
    setError(null);
    try {
      await sendVerificationCode(email);
      setTimer(RESEND_SECONDS);
      setOtpValidTimer(OTP_VALIDITY_SECONDS);
      setCanResend(false);
      setVerificationCode("");
      setSuccess("New verification code sent to your email.");
    } catch (e) {
      if (e instanceof Error) setError(e.message || "Failed to resend verification code");
      else setError("Failed to resend verification code");
    }
    setResendLoading(false);
  };
  const handleSendVerificationCode = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    if (!/^[^@]+@[^@]+\.[^@]+$/.test(email)) {
      setError("Please enter a valid email address.");
      return;
    }
    setLoading(true);
    try {
      const response = await sendVerificationCode(email);
      if (response.success) {
        setSuccess(response.message || "Verification code sent to your email.");
        setShowVerificationStep(true);
        setTimer(RESEND_SECONDS);
        setOtpValidTimer(OTP_VALIDITY_SECONDS);
        setCanResend(false);
        setVerificationCode("");
      } else {
        setError(response.message || "Failed to send verification code");
      }
    } catch (e) {
      if (e instanceof Error) setError(e.message || "Failed to send verification code");
      else setError("Failed to send verification code");
    }
    setLoading(false);
  };
  const handleReset = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    if (verificationCode.length !== 6) {
      setError("Please enter the 6-digit verification code.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }
    if (getPasswordStrength(password) < 4) {
      setError("Password is too weak.");
      return;
    }
    setLoading(true);
    try {
      await resetPasswordWithCode(email, verificationCode, password);
      setSuccess("Password reset successful! Redirecting to login...");
      setTimeout(() => window.location.href = "/login", 1800);
    } catch (e) {
      if (e instanceof Error) setError(e.message || "Failed to reset password");
      else setError("Failed to reset password");
      setVerificationCode("");
    }
    setLoading(false);
  };
  const strength = getPasswordStrength(password);
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-brand-blue-100 via-brand-purple-50 to-brand-pink-100 dark:from-brand-gray-950 dark:via-brand-gray-900 dark:to-brand-gray-950 p-2 md:p-4 relative overflow-hidden">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-brand-blue-400/20 dark:bg-brand-purple-600/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-brand-purple-400/20 dark:bg-brand-blue-600/10 rounded-full blur-3xl animate-pulse" />
      </div>
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md mx-auto z-10"
      >
        <div className="bg-white/90 dark:bg-brand-gray-900/90 rounded-xl shadow-xl p-6 md:p-8 transition-colors">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Sparkles className="w-6 h-6 text-brand-blue-600 dark:text-brand-purple-400" />
            <h1 className="text-2xl font-bold text-brand-gray-900 dark:text-white">Forgot Password</h1>
          </div>
          <p className="text-brand-gray-600 dark:text-brand-gray-300 text-sm mb-6 text-center">
            Reset your password to regain access to your account
          </p>
          {/* Full-page loading overlay */}
          <AnimatePresence>
            {loading && (
              <motion.div
                key="loading-overlay"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
              >
                <div className="flex flex-col items-center gap-3">
                  <Loading size="md" text={showVerificationStep ? 'Resetting...' : 'Sending...'} />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
          <form onSubmit={showVerificationStep ? handleReset : handleSendVerificationCode} className="space-y-6">
            <div>
              <label className="block mb-1 font-medium text-brand-gray-700 dark:text-brand-gray-200">Email</label>
              <input
                type="email"
                className="w-full h-11 px-3 rounded-md border border-input bg-white dark:bg-brand-gray-950 shadow-xs text-base text-brand-gray-900 dark:text-white focus-visible:border-brand-blue-500 focus-visible:ring-2 focus-visible:ring-brand-blue-200 dark:focus-visible:border-brand-purple-500 dark:focus-visible:ring-brand-purple-200 transition-all"
                placeholder="Enter your email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                disabled={loading || showVerificationStep}
                autoFocus
              />
            </div>
            {showVerificationStep && (
              <>
                <div>
                  <label className="block mb-1 font-medium text-brand-gray-700 dark:text-brand-gray-200">Verification Code</label>
                  <div className="flex gap-2 flex-nowrap justify-center w-full mb-2">
                    <OTPInput value={verificationCode} onChange={setVerificationCode} disabled={loading} length={6} />
                  </div>
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-xs text-brand-gray-500 dark:text-brand-gray-300">Verification code valid for {`${String(Math.floor(otpValidTimer / 60)).padStart(2, "0")}:${String(otpValidTimer % 60).padStart(2, "0")}`}</span>
                    <div className="flex flex-col items-end">
                      <button
                        type="button"
                        className={`text-sm underline ml-2 ${canResend ? "text-brand-blue-600 dark:text-brand-purple-400 hover:text-brand-blue-800 dark:hover:text-brand-purple-300" : "text-brand-gray-400 dark:text-brand-gray-500 cursor-not-allowed"}`}
                        onClick={handleResend}
                        disabled={!canResend || resendLoading}
                      >
                        {resendLoading ? <span className="animate-pulse">Resending...</span> : "Resend Code"}
                      </button>
                      {!canResend && timer > 0 && (
                        <span className="text-xs text-brand-gray-500 dark:text-brand-gray-300 mt-1">Resend available in {`${String(Math.floor(timer / 60)).padStart(2, "0")}:${String(timer % 60).padStart(2, "0")}`}</span>
                      )}
                    </div>
                  </div>
                </div>
                <div>
                  <label className="block mb-1 font-medium text-brand-gray-700 dark:text-brand-gray-200">New Password</label>
                  <input
                    type="password"
                    className="w-full h-11 px-3 rounded-md border border-input bg-white dark:bg-brand-gray-950 shadow-xs text-base text-brand-gray-900 dark:text-white focus-visible:border-brand-blue-500 focus-visible:ring-2 focus-visible:ring-brand-blue-200 dark:focus-visible:border-brand-purple-500 dark:focus-visible:ring-brand-purple-200 transition-all"
                    placeholder="Enter new password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    disabled={loading}
                  />
                  {password && (
                    <div className="h-2 mt-1">
                      <div className="w-full bg-brand-gray-200 dark:bg-brand-gray-800 rounded">
                        <div
                          className={`h-2 rounded transition-all duration-300 ${strength <= 1
                            ? "bg-brand-red-400 w-1/5"
                            : strength === 2
                              ? "bg-brand-yellow-400 w-2/5"
                              : strength === 3
                                ? "bg-brand-blue-400 w-3/5"
                                : strength === 4
                                  ? "bg-brand-green-400 w-4/5"
                                  : "bg-brand-green-600 w-full"
                            }`}
                          style={{ width: `${(strength / 5) * 100}%` }}
                        />
                      </div>
                      <span className={`text-xs mt-1 block ${strength < 3 ? "text-brand-red-500" : "text-brand-green-400 dark:text-brand-green-300"}`}>
                        {strengthLabels[strength]}
                      </span>
                    </div>
                  )}
                </div>
                <div>
                  <label className="block mb-1 font-medium text-brand-gray-700 dark:text-brand-gray-200">Confirm Password</label>
                  <input
                    type="password"
                    className="w-full h-11 px-3 rounded-md border border-input bg-white dark:bg-brand-gray-950 shadow-xs text-base text-brand-gray-900 dark:text-white focus-visible:border-brand-blue-500 focus-visible:ring-2 focus-visible:ring-brand-blue-200 dark:focus-visible:border-brand-purple-500 dark:focus-visible:ring-brand-purple-200 transition-all"
                    placeholder="Confirm new password"
                    value={confirm}
                    onChange={e => setConfirm(e.target.value)}
                    disabled={loading}
                  />
                </div>
              </>
            )}
            <button
              type="submit"
              className="w-full h-11 rounded-md font-semibold shadow-md hover:shadow-lg transition-all duration-300 flex items-center justify-center hover:opacity-90 bg-brand-purple-600 hover:bg-brand-purple-700 text-white dark:bg-brand-purple-600 dark:hover:bg-brand-purple-700 dark:text-white"
              disabled={loading}
            >
              {showVerificationStep ? "Reset Password" : "Send Verification Code"}
            </button>
          </form>
          <AnimatePresence>
            {error && (
              <motion.div
                key="error"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="mt-4 text-brand-red-600 text-sm text-center"
              >
                {error}
              </motion.div>
            )}
            {success && (
              <motion.div
                key="success"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="mt-4 text-brand-green-600 text-sm text-center"
              >
                {success}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
}
