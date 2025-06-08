"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { IconX, IconCheck } from "@tabler/icons-react";
import { cn } from "@/lib/utils";

interface ForgotPasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ForgotPasswordModal = ({ isOpen, onClose }: ForgotPasswordModalProps) => {
  const [email, setEmail] = useState("");
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));
    console.log({ email });
    setIsSubmitting(false);
    setIsSubmitted(true);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            className="relative w-full max-w-md p-8 bg-white/90 dark:bg-neutral-900/90 rounded-3xl backdrop-blur-xl shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={onClose}
              className="absolute right-6 top-6 text-neutral-500 hover:text-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-200 transition-colors"
            >
              <IconX size={24} />
            </button>

            <div className="mb-8">
              <h2 className="text-2xl font-bold text-[#800000] dark:text-[#ffb3b3] mb-2">
                Reset Password
              </h2>
              <p className="text-neutral-600 dark:text-neutral-400">
                {isSubmitted
                  ? "If an account exists with this email, you will receive password reset instructions."
                  : "Enter your email address and we'll send you instructions to reset your password."}
              </p>
            </div>

            {!isSubmitted ? (
              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl bg-white/50 dark:bg-neutral-800/50 border border-neutral-200 dark:border-neutral-700 focus:outline-none focus:ring-2 focus:ring-[#800000] dark:focus:ring-[#ffb3b3] transition-all duration-200"
                    required
                  />
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-3 px-4 bg-[#800000] text-white dark:bg-[#ffb3b3] dark:text-[#800000] rounded-xl font-medium hover:opacity-90 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-[#800000]/20 dark:shadow-[#ffb3b3]/20"
                >
                  {isSubmitting ? (
                    <div className="flex items-center justify-center gap-2">
                      <div className="w-5 h-5 border-2 border-white dark:border-[#800000] border-t-transparent rounded-full animate-spin" />
                      <span>Sending instructions...</span>
                    </div>
                  ) : (
                    "Send Reset Instructions"
                  )}
                </button>
              </form>
            ) : (
              <div className="space-y-6">
                <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-xl">
                  <div className="flex items-center gap-3">
                    <div className="flex-shrink-0 w-8 h-8 bg-green-100 dark:bg-green-900/40 rounded-full flex items-center justify-center">
                      <IconCheck className="text-green-600 dark:text-green-400" size={20} />
                    </div>
                    <p className="text-sm text-green-800 dark:text-green-200">
                      Check your email for further instructions. If you don't see it, please check your spam folder.
                    </p>
                  </div>
                </div>
                <button
                  onClick={onClose}
                  className="w-full py-3 px-4 bg-[#800000] text-white dark:bg-[#ffb3b3] dark:text-[#800000] rounded-xl font-medium hover:opacity-90 transition-all duration-200 shadow-lg shadow-[#800000]/20 dark:shadow-[#ffb3b3]/20"
                >
                  Close
                </button>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}; 