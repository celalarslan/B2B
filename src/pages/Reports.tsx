import React, { useState } from 'react';
import { CustomReportBuilder } from '../components/CustomReportBuilder';
import { ReportScheduler } from '../components/ReportScheduler';
import { SavedReport } from '../types/reports';

export default function Reports() {
  const [showScheduler, setShowScheduler] = useState(false);
  const [selectedReport, setSelectedReport] = useState<SavedReport | null>(null);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Custom Reports</h1>
          <p className="mt-2 text-gray-600">
            Build, save, and schedule custom reports to gain insights into your business.
          </p>
        </div>

        <CustomReportBuilder />

        {showScheduler && selectedReport && (
          <ReportScheduler
            reportId={selectedReport.id}
            reportName={selectedReport.name}
            onClose={() => setShowScheduler(false)}
            onScheduled={() => {
              // Handle successful scheduling
              setShowScheduler(false);
            }}
          />
        )}
      </div>
    </div>
  );
}