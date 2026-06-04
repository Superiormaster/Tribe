'use client';

import { useEffect, useState } from 'react';
import { apiRequest } from '@/utils/api';

type Report = {
  id: number;
  reason: string;
  status: string;
};

export default function ReportsPage() {
  const [reports, setReports] = useState<Report[]>([]);

  useEffect(() => {
    fetchReports();
  }, []);

  const fetchReports = async () => {
    try {
      const data = await apiRequest('api/admin/reports/');
      setReports(data);
    } catch (err) {
      console.error(err);
    }
  };

  const resolveReport = async (id: number | string) => {
    try {
      await apiRequest('api/admin/reports/resolve/', {
        method: 'POST',
        data: { report_id: id },
      });

      fetchReports();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">Reports</h1>

      {reports.map((r) => (
        <div key={r.id} className="bg-white p-3 mb-2">
          <p>{r.reason}</p>
          <p>Status: {r.status}</p>

          <button
            onClick={() => resolveReport(r.id)}
            className="bg-green-500 text-white px-3 py-1 mt-2"
          >
            Resolve
          </button>
        </div>
      ))}
    </div>
  );
}