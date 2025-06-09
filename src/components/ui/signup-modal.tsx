"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { IconX, IconEye, IconEyeOff } from "@tabler/icons-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth-context";

interface SignupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginClick: () => void;
}

const PasswordStrengthIndicator = ({ password }: { password: string }) => {
  const getStrength = (password: string) => {
    let score = 0;
    if (password.length >= 8) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/[a-z]/.test(password)) score++;
    if (/[0-9]/.test(password)) score++;
    if (/[^A-Za-z0-9]/.test(password)) score++;
    return score;
  };

  const strength = getStrength(password);
  const strengthText = ["Very Weak", "Weak", "Medium", "Strong", "Very Strong"][strength - 1] || "Very Weak";
  const strengthColor = ["#ef4444", "#f97316", "#eab308", "#22c55e", "#16a34a"][strength - 1] || "#ef4444";

  return (
    <div className="space-y-2">
      <div className="flex gap-1 h-1">
        {[...Array(5)].map((_, i) => (
          <div
            key={i}
            className={cn(
              "flex-1 rounded-full transition-colors",
              i < strength ? "bg-current" : "bg-neutral-200 dark:bg-neutral-700"
            )}
            style={{ color: i < strength ? strengthColor : undefined }}
          />
        ))}
      </div>
      <p className="text-xs text-neutral-600 dark:text-neutral-400">
        Password strength: <span style={{ color: strengthColor }}>{strengthText}</span>
      </p>
    </div>
  );
};

export const SignupModal = ({ isOpen, onClose, onLoginClick }: SignupModalProps) => {
  const [signupType, setSignupType] = useState<"user" | "club">("user");
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    agreeToPDPA: false,
  });
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { signUp } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsSubmitting(true);

    try {
      await signUp(formData.email, formData.password);
      onClose();
    } catch (error: Error | unknown) {
      if (error instanceof Error && error.message === 'Email already registered') {
        setError('This email is already registered. Please use a different email or try logging in.');
      } else {
        setError(error instanceof Error ? error.message : "An error occurred during sign up");
      }
    } finally {
      setIsSubmitting(false);
    }
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
                Join DiscoverSUTD
              </h2>
              <p className="text-neutral-600 dark:text-neutral-400">
                Choose how you want to join us
              </p>
            </div>

            <div className="flex gap-4 mb-8">
              <button
                onClick={() => setSignupType("user")}
                className={cn(
                  "flex-1 py-3 px-4 rounded-xl text-sm font-medium transition-all duration-200",
                  signupType === "user"
                    ? "bg-[#800000] text-white dark:bg-[#ffb3b3] dark:text-[#800000] shadow-lg shadow-[#800000]/20 dark:shadow-[#ffb3b3]/20"
                    : "bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400 hover:bg-neutral-200 dark:hover:bg-neutral-700"
                )}
              >
                As a User
              </button>
              <button
                onClick={() => setSignupType("club")}
                className={cn(
                  "flex-1 py-3 px-4 rounded-xl text-sm font-medium transition-all duration-200",
                  signupType === "club"
                    ? "bg-[#800000] text-white dark:bg-[#ffb3b3] dark:text-[#800000] shadow-lg shadow-[#800000]/20 dark:shadow-[#ffb3b3]/20"
                    : "bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400 hover:bg-neutral-200 dark:hover:bg-neutral-700"
                )}
              >
                As a Club
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                  {signupType === "user" ? "Name" : "Club Name"}
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  className="w-full px-4 py-3 rounded-xl bg-white/50 dark:bg-neutral-800/50 border border-neutral-200 dark:border-neutral-700 focus:outline-none focus:ring-2 focus:ring-[#800000] dark:focus:ring-[#ffb3b3] transition-all duration-200"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                  {signupType === "user" ? "Email" : "Club Email"}
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) =>
                    setFormData({ ...formData, email: e.target.value })
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
                <PasswordStrengthIndicator password={formData.password} />
              </div>

              <div className="space-y-2">
                <div className="flex items-start gap-3">
                  <div className="mt-1">
                    <input
                      type="checkbox"
                      id="pdpa"
                      checked={formData.agreeToPDPA}
                      onChange={(e) =>
                        setFormData({ ...formData, agreeToPDPA: e.target.checked })
                      }
                      className="w-4 h-4 rounded border-neutral-300 text-[#800000] focus:ring-[#800000] dark:border-neutral-600 dark:bg-neutral-800 dark:ring-offset-neutral-900 dark:focus:ring-[#ffb3b3]"
                      required
                    />
                  </div>
                  <label
                    htmlFor="pdpa"
                    className="text-sm text-neutral-600 dark:text-neutral-400"
                  >
                    By submitting my details here, I agree that DiscoverSUTD may
                    collect, use and disclose the information above, within the
                    planning committee, for planning purposes. My personal data
                    will not be retained and will be disposed appropriately upon
                    the completion of this event.
                  </label>
                </div>
              </div>

              {error && (
                <div className="text-red-500 text-sm">{error}</div>
              )}

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3 px-4 bg-[#800000] text-white dark:bg-[#ffb3b3] dark:text-[#800000] rounded-xl font-medium hover:opacity-90 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-[#800000]/20 dark:shadow-[#ffb3b3]/20"
              >
                {isSubmitting ? (
                  <div className="flex items-center justify-center gap-2">
                    <div className="w-5 h-5 border-2 border-white dark:border-[#800000] border-t-transparent rounded-full animate-spin" />
                    <span>Creating account...</span>
                  </div>
                ) : (
                  "Create Account"
                )}
              </button>

              <div className="text-center">
                <p className="text-sm text-neutral-600 dark:text-neutral-400">
                  Already have an account?{" "}
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onLoginClick();
                    }}
                    className="font-medium text-[#800000] hover:text-[#600000] dark:text-[#ffb3b3] dark:hover:text-white transition-colors"
                  >
                    Login here
                  </button>
                </p>
              </div>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}; 