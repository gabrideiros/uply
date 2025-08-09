// UploadProgress.tsx
import React from 'react';
import { motion } from 'framer-motion';

interface UploadProgressProps {
  fileName: string;
  progress: number;
}

export const UploadProgress: React.FC<UploadProgressProps> = ({ fileName, progress }) => {
  return (
    <div className="flex flex-col items-center w-full p-2">
      <motion.p 
        className="text-sm text-gray-300 mb-2 truncate w-full text-center"
        animate={{ opacity: [0.6, 1, 0.6] }}
        transition={{ duration: 1.5, repeat: Infinity }}
      >
        {fileName}
      </motion.p>
      <div className="w-full bg-gray-700 rounded-full h-2">
        <div 
          className="bg-blue-500 h-2 rounded-full transition-all duration-300" 
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
};