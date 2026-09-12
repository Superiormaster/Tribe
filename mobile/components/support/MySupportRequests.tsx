"use client";

import { useEffect, useState } from "react";
import { apiRequest } from "@/utils/api";
import { Trash2 } from "lucide-react";
import Skeleton from "@/components/Skeleton";
import { timeAgo } from "@/utils/timeAgo";

export default function MySupportRequests() {
  const [loading,setLoading]=useState(true);

  const [requests,setRequests]=useState([]);

  useEffect(()=>{
    load();
  },[]);

  async function load(){

    try{

      const data=await apiRequest(
        "api/feedback/support/my/"
      );

      setRequests(data);

    }finally{
      setLoading(false);
    }

  }
  
  async function deleteRequest(id: number) {
    const ok = window.confirm(
      "Delete this support request?"
    );
  
    if (!ok) return;
  
    try {
      await apiRequest(
        `api/feedback/support/${id}/delete/`,
        {
          method: "DELETE",
        }
      );
  
      setRequests((prev) =>
        prev.filter((item: any) => item.id !== id)
      );
    } catch (err) {
      console.error(err);
    }
  }

  if(loading){
    return <Skeleton/>;
  }

  return(
    <div className="space-y-3">

      <h2 className="text-lg font-semibold">
        My Requests
      </h2>

      {requests.length===0 &&(

        <div className="rounded-xl border p-5 text-center text-gray-500">

          No support requests yet.

        </div>

      )}

      {requests.map((item:any)=>(

        <div
          key={item.id}
          className="rounded-xl border dark:border-gray-700 p-4 space-y-2"
        >

          <div className="flex justify-between">

            <h3 className="font-semibold">
              {item.subject}
            </h3>

            <span
              className={`text-xs px-2 py-1 rounded-full ${
                item.status==="resolved"
                ? "bg-green-600 text-white"
                : item.status==="pending"
                ? "bg-yellow-500 text-white"
                : item.status==="rejected"
                ? "bg-red-600 text-white"
                : "bg-blue-600 text-white"
              }`}
            >
              {item.status}
            </span>

          {["resolved", "rejected", "closed"].includes(item.status) && (
              <div className="flex justify-end">
                <button
                  onClick={() => deleteRequest(item.id)}
                  className="flex items-center gap-1 text-red-500 hover:text-red-600 text-sm"
                >
                  <Trash2 size={16} />
                  Delete
                </button>
              </div>
            )}
          </div>

          <div className="text-sm text-gray-500">

            {item.category}

          </div>

          <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">

            {item.message}

          </p>

          <div className="text-xs text-gray-500">

            {timeAgo(item.created_at)}

          </div>

        </div>

      ))}

    </div>
  );
}