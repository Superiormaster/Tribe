import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import api from "../services/api" // your axios instance
import AdminLayout from "../portfolio_admin/AdminLayout"

export default function DeletedItems() {
  const [projects, setProjects] = useState([]);
  const [apps, setApps] = useState([]);
  const [loadingProjects, setLoadingProjects] = useState(true);
  const [loadingApps, setLoadingApps] = useState(true);
  const [message, setMessage] = useState("");
  const [tab, setTab] = useState("projects"); // "projects" or "apps"
  const navigate = useNavigate();

  // Fetch deleted projects
  const fetchDeletedProjects = async () => {
    try {
      const res = await api.get("/admin/projects/deleted");
      setProjects(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingProjects(false);
    }
  };

  // Fetch deleted apps
  const fetchDeletedApps = async () => {
    try {
      const res = await api.get("/admin/apps/deleted");
      setApps(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingApps(false);
    }
  };

  useEffect(() => {
    fetchDeletedProjects();
    fetchDeletedApps();
  }, []);

  // Restore item
  const handleRestore = async (type, id) => {
    try {
      await api.post(`/admin/${type}/${id}/restore`);
      if (type === "projects") {
        setProjects(projects.filter(p => p.id !== id));
      } else {
        setApps(apps.filter(a => a.id !== id));
      }
      setMessage(`${type === "projects" ? "Project" : "App"} restored successfully!`);
    } catch (err) {
      console.error(err);
      setMessage(`Failed to restore ${type === "projects" ? "project" : "app"}.`);
    }
  };
  
  const permanentlyDelete = async (id) => {
    if (!confirm("This action is irreversible. Continue?")) return;
  
    try {
      await api.delete(`/admin/projects/${id}/force`);
      setProjects(projects.filter(p => p.id !== id));
    } catch (err) {
      console.error(err);
      setMessage("Failed to permanently delete project");
    }
  };

  return (
    <AdminLayout>
      <div className="max-w-5xl mx-auto p-6">
        <h1 className="text-3xl font-bold mb-6">Deleted Items/Trash</h1>
        {message && (
          <div className="mb-4 p-3 rounded bg-green-600/20 text-green-400">
            {message}
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-4 mb-6">
          <button
            onClick={() => setTab("projects")}
            className={`px-4 py-2 rounded ${tab === "projects" ? "bg-blue-500 text-white" : "bg-gray-200"}`}
          >
            Deleted Projects
          </button>
          <button
            onClick={() => setTab("apps")}
            className={`px-4 py-2 rounded ${tab === "apps" ? "bg-blue-500 text-white" : "bg-gray-200"}`}
          >
            Deleted Apps
          </button>
        </div>

        {/* Content */}
        {tab === "projects" && (
          <>
            {loadingProjects ? (
              <p>Loading deleted projects...</p>
            ) : projects.length === 0 ? (
              <p>No deleted projects found.</p>
            ) : (
              <ul className="space-y-4">
                {projects.map((p) => (
                  <li key={p.id} className="p-4 border rounded flex justify-between items-center">
                    <div>
                      <strong>{p.title}</strong>
                      <p className="text-gray-500">{p.description}</p>
                    </div>
                    <button
                      onClick={() => handleRestore("projects", p.id)}
                      className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded"
                    >
                      Restore
                    </button>
                    <button
                      onClick={() => permanentlyDelete(p.id)}
                      className="bg-red-600 text-white px-3 py-1 rounded"
                    >
                      Delete Forever
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </>
        )}

        {tab === "apps" && (
          <>
            {loadingApps ? (
              <p>Loading deleted apps...</p>
            ) : apps.length === 0 ? (
              <p>No deleted apps found.</p>
            ) : (
              <ul className="space-y-4">
                {apps.map((a) => (
                  <li key={a.id} className="p-4 border rounded flex justify-between items-center">
                    <div>
                      <strong>{a.name}</strong>
                      <p className="text-gray-500">{a.description}</p>
                    </div>
                    <button
                      onClick={() => handleRestore("apps", a.id)}
                      className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded"
                    >
                      Restore
                    </button>
                    <button
                      onClick={() => permanentlyDelete(a.id)}
                      className="bg-red-600 text-white px-3 py-1 rounded"
                    >
                      Delete Forever
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
        </div>
        <button
          onClick={() => navigate("/admin")}
          className="px-4 py-2 bg-gray-700 text-white rounded mb-4"
        >
          ← Back to Dashboard
        </button>
    </AdminLayout>
  );
}