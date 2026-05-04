import { MyImage } from '@/assets'
import { logout } from "../utils/auth"
import { NavLink } from "react-router-dom"
import {
  LayoutDashboard,
  FolderKanban,
  MessageSquare,
  Settings,
  Moon,
  Sun
} from "lucide-react"
import { canAccess } from "@/utils/canAccess"
import { useEffect, useState, useContext } from "react"
import { UserContext } from "@/portfolio_admin/UserContext"


export default function Sidebar({ isOpen, onClose }) {
  const { user } = useContext(UserContext);
  const [dark, setDark] = useState(
    localStorage.getItem("theme") === "dark"
  )

  const links = [
    { name: "Dashboard", path: "/admin", icon: LayoutDashboard },
    { name: "Projects", path: "/admin/projects", icon: FolderKanban },
    { name: "Messages", path: "/admin/messages", icon: MessageSquare },
    { name: "Apps", path: "/admin/apps", icon: Settings }
  ]

  // Apply theme
  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark)
    localStorage.setItem("theme", dark ? "dark" : "light")
  }, [dark])

  return (
    <aside
      className={`
        fixed z-30 top-0 left-0 h-screen w-64 bg-gray-900 text-white
        transform transition-transform duration-300
        ${isOpen ? "translate-x-0" : "-translate-x-full"}
        lg:translate-x-0 lg:static
      `}
    >
      {/* Header */}
      <div className="flex flex-col items-center py-6 border-b border-white/10">
        <div className="w-12 h-12 rounded-full overflow-hidden shadow-lg">
          <img src={MyImage} alt="Admin" />
        </div>
        <h2 className="mt-3 font-bold uppercase text-lg">Admin Panel</h2>
      </div>

      {/* Nav */}
      <nav className="p-4 space-y-2">
        {links.map(({ name, path, icon: Icon }) => (
          <NavLink
            key={name}
            to={path}
            onClick={onClose}
            className={({ isActive }) =>
              `flex items-center gap-3 px-4 py-3 rounded-lg transition
              ${isActive
                ? "bg-indigo-600 shadow-lg shadow-indigo-600/40"
                : "hover:bg-zinc-800"}`
            }
          >
            <Icon size={20} />
            {name}
          </NavLink>
        ))}
        {canAccess(user, ["admin"]) && (
          <NavLink
            to="/admin/settings"
            className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-zinc-800"
          >
            <Settings size={20} />
            Settings
          </NavLink>
        )}
      </nav>

      {/* Footer */}
      <div className="mt-auto p-4 space-y-3 border-t border-white/10">
        <button
          onClick={() => setDark(!dark)}
          className="flex items-center gap-2 px-4 py-2 w-full rounded hover:bg-zinc-800"
        >
          {dark ? <Sun size={18} /> : <Moon size={18} />}
          {dark ? "Light Mode" : "Dark Mode"}
        </button>

        <button
          onClick={logout}
          className="w-full text-left px-4 py-2 text-red-400 hover:bg-red-900/40 rounded"
        >
          Logout
        </button>
      </div>
    </aside>
  )
}
