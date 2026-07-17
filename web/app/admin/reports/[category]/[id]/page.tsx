'use client';

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { apiRequest } from "@/utils/api";
import { useNavigation } from "@/utils/useNavigation";
import Skeleton from "@/components/Skeleton";

type Report = {
  id: number;

  report_category: "content" | "problem";

  reason?: string;
  details?: string;

  report_type: string;
  status: string;
  created_at: string;

  reporter?: {
    id: number;
    username: string;
    email: string;
    avatar?: string | null;
  };

  user?: {
    id: number;
    username: string;
    email: string;
    avatar?: string | null;
  };

  message?: string;

  target_type?: string;
  target_id?: number | null;

  target_user?: {
    id: number;
    username: string;
    email: string;
  } | null;

  target_post?: {
    id: number;
  } | null;

  target_comment?: {
    id: number;
  } | null;

  target_message?: {
    id: number;
  } | null;

  target_community?: {
    id: number;
    name: string;
  } | null;
};

export default function ReportDetailsPage() {
  const params = useParams();
  const { push } = useNavigation();

  const [report, setReport] = useState<Report | null>(null);
  const [loading, setLoading] = useState(true);
  const category = params.category as "content" | "problem";
  const id = params.id as string;

  useEffect(() => {
    fetchReport();
  }, []);

  async function fetchReport() {
    try {
      const res = await apiRequest(
        `api/admin/reports/${category}/${id}/`
      );

      setReport(res);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <Skeleton />
    );
  }

  if (!report) {
    return (
      <div className="p-8">
        Report not found.
      </div>
    );
  }
  
  return (
    <div className="space-y-6">
  
      <h1 className="text-3xl font-bold">
        Report Details
      </h1>
  
      <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow p-6">

        <div className="flex items-center justify-between">
      
          <h2 className="text-xl font-semibold">
            {report.report_category === "problem"
              ? "Submitted By"
              : "Reporter"}
          </h2>
      
          <button
            onClick={() =>
              push(
                `/admin/users/${
                  report.report_category === "problem"
                    ? report.user?.id
                    : report.reporter?.id
                }`
              )
            }
            className="bg-indigo-600 text-white px-4 py-2 rounded-xl"
          >
            View User
          </button>
      
        </div>
      
        <div className="flex items-center gap-4 mt-5">
      
          {(
            report.report_category === "problem"
              ? report.user?.avatar
              : report.reporter?.avatar
          ) ? (
      
            <img
              src={
                report.report_category === "problem"
                  ? report.user!.avatar!
                  : report.reporter!.avatar!
              }
              className="w-16 h-16 rounded-full object-cover"
            />
      
          ) : (
      
            <div className="w-16 h-16 rounded-full bg-gray-300 flex items-center justify-center font-bold text-xl">
              {(report.report_category === "problem"
                ? report.user?.username
                : report.reporter?.username
              )?.charAt(0).toUpperCase()}
            </div>
      
          )}
      
          <div>
      
            <h3 className="font-semibold">
              {report.report_category === "problem"
                ? report.user?.username
                : report.reporter?.username}
            </h3>
      
            <p className="text-gray-500">
              {report.report_category === "problem"
                ? report.user?.email
                : report.reporter?.email}
            </p>
            <p className="text-sm text-gray-400">
              User ID: {report.report_category === "problem"
                ? report.user?.id
                : report.reporter?.id}
            </p>
      
          </div>
      
        </div>
      </div>
  
      <div className="grid md:grid-cols-2 gap-5">

        <div>
      
          <p className="text-sm text-gray-500">
            Type
          </p>
      
          <p className="font-semibold capitalize">
            {report.report_type.replace(/_/g, " ")}
          </p>
      
        </div>
      
        <div>
      
          <p className="text-sm text-gray-500">
            Status
          </p>
      
          <p className="font-semibold capitalize">
            {report.status}
          </p>
      
        </div>
      
        {report.report_category === "content" && (
          <>
      
            <div>
      
              <p className="text-sm text-gray-500">
                Reason
              </p>
      
              <p className="font-semibold capitalize">
                {report.reason?.replace(/_/g, " ")}
              </p>
      
            </div>
    
            <div>
              <p className="text-sm text-gray-500">
                Status
              </p>
    
              <span
                className={`inline-flex rounded-full px-3 py-1 text-sm font-medium ${
                  report.status === "resolved"
                    ? "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300"
                    : report.status === "pending"
                    ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300"
                    : report.status === "reviewed"
                    ? "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300"
                    : "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300"
                }`}
              >
                {report.status}
              </span>
            </div>
      
            <div>
      
              <p className="text-sm text-gray-500">
                Target
              </p>
      
              <p className="font-semibold capitalize">
                {report.target_type}
              </p>
      
            </div>
      
          </>
        )}
      
        <div>
      
          <p className="text-sm text-gray-500">
            Created
          </p>
      
          <p>
            {new Date(report.created_at).toLocaleString()}
          </p>
      
        </div>
  
        <div className="mt-6">

          <p className="text-sm text-gray-500 mb-2">
            {report.report_category === "problem"
              ? "Problem Description"
              : "Report Description"}
          </p>
        
          <div className="border rounded-xl p-4">
        
            {report.report_category === "problem"
              ? report.message
              : report.details}
        
          </div>
  
        </div>
  
      </div>
  
      {report.report_category === "content" && (
        <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow p-6">
      
          <h2 className="text-xl font-semibold mb-5">
            Reported Content
          </h2>
          
            {/* USER */}
          
            {report.target_type === "user" &&
              report.target_user && (
                <div className="space-y-4">
          
                  <div>
                    <p className="text-sm text-gray-500">
                      Reported User
                    </p>
          
                    <h3 className="font-semibold text-lg">
                      {report.target_user.username}
                    </h3>
          
                    <p className="text-gray-500">
                      {report.target_user.email}
                    </p>
                  </div>
          
                  <button
                    onClick={() =>
                      push(
                        `/admin/users/${report.target_user!.id}`
                      )
                    }
                    className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl"
                  >
                    View Profile
                  </button>
          
                </div>
              )}
          
            {/* POST */}
          
            {report.target_type === "post" &&
              report.target_post && (
                <div className="space-y-4">
          
                  <p>
                    Reported Post
                  </p>
          
                  <p className="text-gray-500">
                    Post ID: {report.target_post.id}
                  </p>
          
                  <button
                    onClick={() =>
                      push(
                        `/admin/posts/${report.target_post!.id}`
                      )
                    }
                    className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl"
                  >
                    View Post
                  </button>
          
                </div>
              )}
          
            {/* COMMENT */}
          
            {report.target_type === "comment" &&
              report.target_comment && (
                <div className="space-y-4">
          
                  <p>
                    Reported Comment
                  </p>
          
                  <p className="text-gray-500">
                    Comment ID: {report.target_comment.id}
                  </p>
          
                  <button
                    onClick={() =>
                      push(
                        `/admin/comments/${report.target_comment!.id}`
                      )
                    }
                    className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl"
                  >
                    View Comment
                  </button>
          
                </div>
              )}
          
            {/* MESSAGE */}
          
            {report.target_type === "message" &&
              report.target_message && (
                <div className="space-y-4">
          
                  <p>
                    Reported Message
                  </p>
          
                  <p className="text-gray-500">
                    Message ID: {report.target_message.id}
                  </p>
          
                  <button
                    onClick={() =>
                      push(
                        `/admin/messages/${report.target_message!.id}`
                      )
                    }
                    className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl"
                  >
                    View Message
                  </button>
          
                </div>
              )}
          
            {/* COMMUNITY */}
          
            {report.target_type === "community" &&
              report.target_community && (
                <div className="space-y-4">
          
                  <div>
          
                    <p className="text-sm text-gray-500">
                      Community
                    </p>
          
                    <h3 className="font-semibold">
                      {report.target_community.name}
                    </h3>
          
                  </div>
          
                  <button
                    onClick={() =>
                      push(
                        `/admin/communities/${report.target_community!.id}`
                      )
                    }
                    className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl"
                  >
                    View Community
                  </button>
          
                </div>
              )}
          
            {/* REPOST */}
          
            {report.target_type === "repost" && (
              <div className="space-y-4">
          
                <p>
                  Reported Repost
                </p>
          
                <p className="text-gray-500">
                  Repost ID: {report.target_id}
                </p>
          
              </div>
            )}
          
        </div>
      )}
      
      {report.report_category === "problem" && (
        <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow p-6">
      
          <h2 className="text-xl font-semibold mb-5">
            Problem Report
          </h2>
      
          <div className="space-y-4">
      
            <div>
      
              <p className="text-sm text-gray-500">
                Category
              </p>
      
              <p className="font-semibold capitalize">
                {report.report_type.replace(/_/g, " ")}
              </p>
      
            </div>
      
            <div>
      
              <p className="text-sm text-gray-500 mb-2">
                Submitted Message
              </p>
      
              <div className="border rounded-xl p-4 whitespace-pre-wrap">
                {report.message}
              </div>
      
            </div>
      
          </div>
      
        </div>
      )}
    </div>
  );
}