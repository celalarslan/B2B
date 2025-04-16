import React from 'react';
import AITrainingModule from '../components/AITrainingModule';
import { useAuth } from '../hooks/useSupabase';

const AITraining = () => {
  const { organization } = useAuth();

  return (
    <div className="space-y-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">AI Training</h1>
        <p className="mt-2 text-gray-600">
          Train your AI assistant with custom data to improve performance for your specific business needs.
        </p>
      </div>

      <AITrainingModule 
        onTrainingComplete={() => {
          // Handle training completion, e.g., show a success message or redirect
          console.log('Training completed successfully');
        }}
      />
    </div>
  );
};

export default AITraining;