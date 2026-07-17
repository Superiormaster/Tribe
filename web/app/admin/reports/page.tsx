'use client';

import { useEffect, useState } from 'react';
import { apiRequest } from '@/utils/api';
import { useNavigation } from '@/utils/useNavigation';
import { ChevronRight } from 'lucide-react';

type Report = {
  id: number;
  report_category: "content" | "problem";
  reason?: string;
  details?: string;
  report_type: string;
  message?: string;
  status: string;
  reporter: {
    id: number;
    username: string;
  };
};

type ReportResponse = {
  count: number;
  next: string | null;
  previous: string | null;
  results: Report[];
};

export default function ReportsPage() {
  const { push } = useNavigation();

  const [reports, setReports] = useState<Report[]>([]);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  const [count, setCount] = useState(0);
  const [next, setNext] = useState<string | null>(null);
  const [previous, setPrevious] = useState<string | null>(null);

  useEffect(() => {
    fetchReports();
  }, [page, search]);

  const fetchReports = async () => {
    try {
      const data: ReportResponse = await apiRequest(
        `api/admin/reports/?page=${page}&search=${encodeURIComponent(
          search
        )}`
      );

      setReports(data.results);
      setCount(data.count);
      setNext(data.next);
      setPrevious(data.previous);
    } catch (err) {
      console.error(err);
    }
  };

  const resolveReport = async (id: number) => {
    try {
      await apiRequest('api/admin/reports/resolve/', {
        method: 'POST',
        data: {
          report_id: id,
        },
      });

      fetchReports();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-5">

      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">
          Reports ({count})
        </h1>
      </div>

      <input
        value={search}
        onChange={(e) => {
          setPage(1);
          setSearch(e.target.value);
        }}
        placeholder="Search reports..."
        className="w-full rounded-xl border p-3"
      />

      <div className="space-y-3">
        {reports.map((report) => (
          <div
            key={report.id}
            onClick={() =>
              push(
                `/admin/reports/${report.report_category}/${report.id}`
              )
            }
            className="cursor-pointer rounded-xl bg-white dark:bg-zinc-900 p-4 shadow flex items-center justify-between hover:bg-gray-50 dark:hover:bg-zinc-800"
          >
            <div className="min-w-0 flex-1">

              <p
                className="font-semibold truncate"
                title={report.reporter.username}
              >
                  {report.reporter.username}
              </p>
              
              <p className="text-xs text-gray-400 capitalize">
                  {report.report_category === "problem"
                      ? `Problem • ${report.report_type.replace("_", " ")}`
                      : `Content • ${report.report_type.replace("_", " ")}`}
              </p>

              <div className="mt-1 space-y-1">
                <p className="text-sm text-gray-500">
                  {report.report_category === "content" && report.reason}
                </p>
              
                <span
                  className={`inline-flex rounded-full px-2 py-0.5 text-xs ${
                    report.report_category === "problem"
                      ? "bg-purple-100 text-purple-700"
                      : "bg-blue-100 text-blue-700"
                  }`}
                >
                  {report.report_category === "problem"
                    ? "Problem Report"
                    : "Content Report"}
                </span>
              </div>

              <span
                className={`inline-block mt-2 rounded-full px-2 py-1 text-xs
                ${
                  report.status === 'resolved'
                    ? 'bg-green-100 text-green-700'
                    : report.status === 'pending'
                    ? 'bg-yellow-100 text-yellow-700'
                    : report.status === 'ignored'
                    ? 'bg-gray-100 text-gray-700'
                    : 'bg-blue-100 text-blue-700'
                }`}
              >
                {report.status}
              </span>

            </div>

            <div className="flex items-center gap-3">

              {report.status !== 'resolved' && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    resolveReport(report.id);
                  }}
                  className="rounded-lg bg-green-600 px-3 py-1 text-white"
                >
                  Resolve
                </button>
              )}

              <ChevronRight size={18} />

            </div>
          </div>
        ))}
      </div>

      <div className="flex justify-between">

        <button
          disabled={!previous}
          onClick={() => setPage((p) => p - 1)}
          className="rounded-lg border px-4 py-2 disabled:opacity-50"
        >
          Previous
        </button>

        <span className="self-center">
          Page {page}
        </span>

        <button
          disabled={!next}
          onClick={() => setPage((p) => p + 1)}
          className="rounded-lg border px-4 py-2 disabled:opacity-50"
        >
          Next
        </button>

      </div>

    </div>
  );
}