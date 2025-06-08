"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { IconX, IconEye, IconEyeOff } from "@tabler/icons-react";
import { ForgotPasswordModal } from "./forgot-password-modal";
import { GreetingModal } from "./greeting-modal";
import { useRouter } from "next/navigation";

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSignupClick: () => void;
}

export const LoginModal = ({ isOpen, onClose, onSignupClick }: LoginModalProps) => {
  const router = useRouter();
  const [formData, setFormData] = useState({
    identifier: "", // can be email or name
    password: "",
  });
  const [isForgotPasswordOpen, setIsForgotPasswordOpen] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showGreeting, setShowGreeting] = useState(false);
  const [username, setUsername] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));
    console.log(formData);
    setIsSubmitting(false);
    
    // Extract username from identifier (in a real app, this would come from the API response)
    const displayName = formData.identifier.split('@')[0];
    setUsername(displayName);
    setShowGreeting(true);
  };

  // Automatically redirect to home after showing greeting for 2 seconds
  useEffect(() => {
    if (showGreeting) {
      const timer = setTimeout(() => {
        setShowGreeting(false);
        onClose();
        router.push('/home');
      }, 2000);

      return () => clearTimeout(timer);
    }
  }, [showGreeting, onClose, router]);

  return (
    <>
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
                  Welcome Back
                </h2>
                <p className="text-neutral-600 dark:text-neutral-400">
                  Sign in to your account
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                    Email or Name
                  </label>
                  <input
                    type="text"
                    value={formData.identifier}
                    onChange={(e) =>
                      setFormData({ ...formData, identifier: e.target.value })
                    }
                    className="w-full px-4 py-3 rounded-xl bg-white/50 dark:bg-neutral-800/50 border border-neutral-200 dark:border-neutral-700 focus:outline-none focus:ring-2 focus:ring-[#800000] dark:focus:ring-[#ffb3b3] transition-all duration-200"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                    Password
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      value={formData.password}
                      onChange={(e) =>
                        setFormData({ ...formData, password: e.target.value })
                      }
                      className="w-full px-4 py-3 rounded-xl bg-white/50 dark:bg-neutral-800/50 border border-neutral-200 dark:border-neutral-700 focus:outline-none focus:ring-2 focus:ring-[#800000] dark:focus:ring-[#ffb3b3] transition-all duration-200 pr-12"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-200 transition-colors"
                    >
                      {showPassword ? <IconEyeOff size={20} /> : <IconEye size={20} />}
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="remember"
                      className="w-4 h-4 rounded border-neutral-300 text-[#800000] focus:ring-[#800000] dark:border-neutral-600 dark:bg-neutral-800 dark:ring-offset-neutral-900 dark:focus:ring-[#ffb3b3]"
                    />
                    <label
                      htmlFor="remember"
                      className="ml-2 block text-sm text-neutral-600 dark:text-neutral-400"
                    >
                      Remember me
                    </label>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsForgotPasswordOpen(true)}
                    className="text-sm font-medium text-[#800000] hover:text-[#600000] dark:text-[#ffb3b3] dark:hover:text-white transition-colors"
                  >
                    Forgot password?
                  </button>
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-3 px-4 bg-[#800000] text-white dark:bg-[#ffb3b3] dark:text-[#800000] rounded-xl font-medium hover:opacity-90 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-[#800000]/20 dark:shadow-[#ffb3b3]/20"
                >
                  {isSubmitting ? (
                    <div className="flex items-center justify-center gap-2">
                      <div className="w-5 h-5 border-2 border-white dark:border-[#800000] border-t-transparent rounded-full animate-spin" />
                      <span>Signing in...</span>
                    </div>
                  ) : (
                    "Sign In"
                  )}
                </button>

                <div className="text-center">
                  <p className="text-sm text-neutral-600 dark:text-neutral-400">
                    Don&apos;t have an account?{" "}
                    <button
                      type="button"
                      onClick={() => {
                        onClose();
                        onSignupClick();
                      }}
                      className="font-medium text-[#800000] hover:text-[#600000] dark:text-[#ffb3b3] dark:hover:text-white transition-colors"
                    >
                      Sign up
                    </button>
                  </p>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      <ForgotPasswordModal 
        isOpen={isForgotPasswordOpen} 
        onClose={() => setIsForgotPasswordOpen(false)} 
      />
      <GreetingModal
        isOpen={showGreeting}
        username={username}
      />
    </>
  );
}; 