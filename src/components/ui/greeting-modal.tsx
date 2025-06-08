"use client";

import { motion, AnimatePresence } from "motion/react";
import { IconCheck } from "@tabler/icons-react";

interface GreetingModalProps {
  isOpen: boolean;
  username: string;
}

export const GreetingModal = ({ isOpen, username }: GreetingModalProps) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            className="relative w-full max-w-md p-8 bg-white/90 dark:bg-neutral-900/90 rounded-3xl backdrop-blur-xl shadow-2xl"
          >
            <div className="flex flex-col items-center text-center space-y-6">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2, type: "spring" }}
                className="w-16 h-16 bg-green-100 dark:bg-green-900/40 rounded-full flex items-center justify-center"
              >
                <IconCheck className="text-green-600 dark:text-green-400" size={32} />
              </motion.div>

              <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.4 }}
                className="space-y-2"
              >
                <h2 className="text-2xl font-bold text-[#800000] dark:text-[#ffb3b3]">
                  Welcome back, {username}!
                </h2>
                <p className="text-neutral-600 dark:text-neutral-400">
                  We&apos;re glad to see you again. Taking you to your dashboard...
                </p>
              </motion.div>

              <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.6 }}
                className="flex items-center justify-center"
              >
                <div className="w-6 h-6 border-2 border-[#800000] dark:border-[#ffb3b3] border-t-transparent rounded-full animate-spin" />
              </motion.div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}; 