import React, { useState } from 'react';
import VoiceAnalyticsComponent from '../components/VoiceAnalytics';
import { useAuth } from '../hooks/useSupabase';

const VoiceAnalytics = () => {
  const { organization } = useAuth();
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d' | 'all'>('30d');

  return (
    <div className="space-y-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Voice Analytics</h1>
        <p className="mt-2 text-gray-600">
          Analyze call patterns, performance metrics, and customer interactions to improve your voice assistant.
        </p>
      </div>

      <VoiceAnalyticsComponent timeRange={timeRange} />
    </div>
  );
};

export default VoiceAnalytics;