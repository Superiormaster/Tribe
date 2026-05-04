'use client';
import { useEffect, useState, useContext } from "react";
import { UserContext } from "@/components/UserContext";
import { useRouter } from "next/navigation";
import { apiRequest } from "@/utils/api";

export default function AdminDashboard() {
  const [tribes, setTribes] = useState([]);
  const [name, setName] = useState('');
  const [allowReels, setAllowReels] = useState(false);
  const { user } = useContext(UserContext);
  const router = useRouter();

  const fetchTribes = async () => {
    const data = await apiRequest("api/admin/tribes/");
    setTribes(data);
  };

  useEffect(() => {
    fetchTribes();
  }, []);
  
  useEffect(() => {
    if (!user?.is_superuser) {
      router.push("/");
    }
  }, [user]);

  const createTribe = async () => {
    try {
      await apiRequest("api/admin/tribes/", {
        method: "POST",
        data: {
          name,
          allow_reels: allowReels,
        },
      });

      setName('');
      setAllowReels(false);
      fetchTribes();
      alert("Tribe created ✅");
    } catch (err) {
      console.error(err);
      alert("Error creating tribe");
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-4 space-y-6">

      <h1 className="text-2xl font-bold">Admin Dashboard</h1>

      {/* Create Tribe */}
      <div className="bg-white p-4 rounded shadow space-y-3">
        <h2 className="font-semibold">Create Tribe</h2>

        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Tribe name"
          className="w-full border p-2 rounded"
        />

        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={allowReels}
            onChange={() => setAllowReels(!allowReels)}
          />
          Allow Reels
        </label>

        <button
          onClick={createTribe}
          className="bg-indigo-600 text-white px-4 py-2 rounded"
        >
          Create
        </button>
      </div>

      {/* Tribe List */}
      <div className="bg-white p-4 rounded shadow">
        <h2 className="font-semibold mb-3">All Tribes</h2>

        {tribes.map((t: any) => (
          <div key={t.id} className="flex justify-between border-b py-2">
            <span>{t.name}</span>
            <span className="text-sm text-gray-500">
              {t.allow_reels ? "🎬 Reels Enabled" : ""}
            </span>
          </div>
        ))}
      </div>

    </div>
  );
}