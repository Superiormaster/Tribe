"use client";

import { useEffect, useState } from "react";
import { apiRequest } from "@/utils/api";
import Skeleton from "@/components/Skeleton";
import { useNavigation } from "@/utils/useNavigation";
import { Search } from "lucide-react";

export default function SupportList() {
  const { push } = useNavigation();

  const [loading, setLoading] = useState(true);

  const [support, setSupport] = useState<any[]>([]);

  const [search, setSearch] = useState("");

  const [status, setStatus] =
    useState("");

  const [category, setCategory] =
    useState("");

  useEffect(() => {
    load();
  }, [status, category]);

  async function load() {
    setLoading(true);

    try {
      const query = new URLSearchParams();

      if (status) {
        query.append("status", status);
      }

      if (category) {
        query.append("category", category);
      }

      if (search) {
        query.append("search", search);
      }

      const data = await apiRequest(
        `api/admin/support/?${query.toString()}`
      );

      setSupport(data.results || []);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return <Skeleton />;
  }

  return (
    <div className="space-y-5">

      <h1 className="text-2xl font-bold">
        Support Requests
      </h1>

      <div className="flex gap-3">

        <div className="relative flex-1">

          <Search
            size={18}
            className="absolute left-3 top-3 text-gray-400"
          />

          <input
            placeholder="Search..."
            value={search}
            onChange={(e)=>{
              setSearch(e.target.value);
            }}
            onKeyDown={(e)=>{
              if(e.key==="Enter"){
                load();
              }
            }}
            className="w-full border rounded-lg pl-10 pr-3 py-2"
          />

        </div>

        <button
          onClick={load}
          className="px-4 rounded-lg bg-blue-600 text-white"
        >
          Search
        </button>

      </div>

      <div className="flex gap-3">

        <select
          value={status}
          onChange={(e)=>
            setStatus(e.target.value)
          }
          className="border rounded-lg p-2"
        >
          <option value="">
            All Status
          </option>

          <option value="pending">
            Pending
          </option>

          <option value="in_review">
            In Review
          </option>

          <option value="resolved">
            Resolved
          </option>

          <option value="rejected">
            Rejected
          </option>

          <option value="closed">
            Closed
          </option>

        </select>

        <select
          value={category}
          onChange={(e)=>
            setCategory(e.target.value)
          }
          className="border rounded-lg p-2"
        >

          <option value="">
            All Categories
          </option>

          <option value="community">
            Community
          </option>

          <option value="media_change">
            Media Change
          </option>

          <option value="ownership_transfer">
            Ownership Transfer
          </option>

          <option value="verification">
            Verification
          </option>

          <option value="account">
            Account
          </option>

          <option value="billing">
            Billing
          </option>

          <option value="other">
            Other
          </option>

        </select>

      </div>

      <div className="space-y-3">

        {support.map((item)=>(
          <button
            key={item.id}
            onClick={()=>
              push(
                `/admin/support/${item.id}`
              )
            }
            className="w-full border rounded-xl p-4 text-left hover:bg-gray-50 dark:hover:bg-gray-800"
          >

            <div className="flex justify-between">

              <div>

                <p className="font-semibold">
                  {item.subject}
                </p>

                <p className="text-sm text-gray-500">
                  {item.username}
                </p>

              </div>

              <span
                className={`px-2 py-1 rounded-full text-xs text-white ${
                  item.status==="resolved"
                  ? "bg-green-600"

                  : item.status==="rejected"
                  ? "bg-red-600"

                  : item.status==="pending"
                  ? "bg-yellow-500"

                  : item.status==="closed"
                  ? "bg-gray-600"

                  : "bg-blue-600"
                }`}
              >
                {item.status}
              </span>

            </div>

            <div className="mt-2 text-sm text-gray-500">

              {item.category}

            </div>

          </button>
        ))}

      </div>

    </div>
  );
}