import React from 'react';
import { Loader2, Phone } from 'lucide-react';
import { motion } from 'framer-motion';

const LoadingScreen: React.FC = () => {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-black">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="text-center"
      >
        <div className="inline-flex items-center justify-center p-3 bg-primary rounded-full mb-4">
          <Phone className="h-8 w-8 text-white" />
        </div>
        <h1 className="text-2xl font-bold mb-4 text-white">
          Call Forwarding Assistant
        </h1>
        <div className="flex justify-center">
          <Loader2 className="w-8 h-8 text-primary animate-spin" />
        </div>
      </motion.div>
    </div>
  );
};

export default LoadingScreen;