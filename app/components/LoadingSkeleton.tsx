'use client';

import { motion } from 'framer-motion';

interface LoadingSkeletonProps {
  message?: string;
}

export default function LoadingSkeleton({ message = "Loading chat..." }: LoadingSkeletonProps) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-main-bg px-4">
      <div className="flex flex-col items-center space-y-4 sm:space-y-6">
        {/* Animated dots */}
        <div className="flex space-x-2">
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              className="w-2 h-2 sm:w-3 sm:h-3 bg-accent rounded-full"
              animate={{
                scale: [1, 1.2, 1],
                opacity: [0.5, 1, 0.5],
              }}
              transition={{
                duration: 1.5,
                repeat: Infinity,
                delay: i * 0.2,
                ease: "easeInOut",
              }}
            />
          ))}
        </div>
        
        {/* Loading message */}
        <motion.div
          className="text-white text-base sm:text-lg font-medium text-center"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          {message}
        </motion.div>
        
        {/* Progress bar */}
        <div className="w-48 sm:w-64 h-1 bg-gray-700 rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-accent rounded-full"
            initial={{ width: "0%" }}
            animate={{ width: "100%" }}
            transition={{
              duration: 2,
              ease: "easeInOut",
            }}
          />
        </div>
      </div>
    </div>
  );
}