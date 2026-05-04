"use client";

import { useState, useEffect } from "react";
import { apiRequest } from "@/utils/api";
import Link from "next/link";
import { Search } from "lucide-react";

export default function SearchPage() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<any>({
    users: [],
    tribes: [],
    communities: [],
  });
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("all");
  const [history, setHistory] = useState<string[]>([]);
  const [trending, setTrending] = useState<string[]>([
    "Tech communities",
    "Football tribes",
    "Creators",
    "Designers",
    "Startups",
  ]);
  
  useEffect(() => {
    const savedHistory = JSON.parse(localStorage.getItem("searchHistory") || "[]");
    setHistory(savedHistory);
  }, []);

  // 🔥 Live search (debounced)
  useEffect(() => {
    const delayDebounce = setTimeout(() => {
      if (query.trim()) {
        fetchResults(query);
      } else {
        setResults({ users: [], tribes: [], communities: [] });
      }
    }, 400); // delay for better UX

    return () => clearTimeout(delayDebounce);
  }, [query]);

  const fetchResults = async (q: string) => {
    setLoading(true);
    try {
      const data = await apiRequest(`api/search/?q=${q}`);
      setResults(data);
      if (q.trim() && !history.includes(q.trim())) {
        const newHistory = [q.trim(), ...history].slice(0, 10); // keep max 10
        localStorage.setItem("searchHistory", JSON.stringify(newHistory));
        setHistory(newHistory);
      }
    } catch (err) {
      console.error("Search failed:", err);
    } finally {
      setLoading(false);
    }
  };
  
  const renderTabResults = () => {
    if (!query) return null;

    const tabResults =
      activeTab === "all"
        ? [...results.users, ...results.tribes, ...results.communities, ...results.posts]
        : activeTab === "people"
        ? results.users
        : activeTab === "communities"
        ? [...results.tribes, ...results.communities]
        : results.posts;

    if (!tabResults || tabResults.length === 0)
      return <p className="text-gray-500 text-sm mt-4">No results found for "{query}"</p>;

    return (
      <div className="mt-4 space-y-4">
        {activeTab === "all" || activeTab === "people"
          ? results.users.map((u: any) => (
              <Link key={u.id} href={`/profile/${u.username}`}>
                <div className="p-3 border text-gray-700 dark: rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800">
                  👤 {u.username}
                </div>
              </Link>
            ))
          : null}

        {activeTab === "all" || activeTab === "communities"
          ? [...results.tribes, ...results.communities].map((c: any) => (
              <Link key={c.id} href={`/main/community/${c.id}`}>
                <div className="p-3 border rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800">
                  💬 {c.name}
                </div>
              </Link>
            ))
          : null}

        {activeTab === "all" || activeTab === "posts"
          ? results.posts?.map((p: any) => (
              <Link key={p.id} href={`/post/${p.id}`}>
                <div className="p-3 border rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800">
                  📝 {p.title || "Post content"}
                </div>
              </Link>
            ))
          : null}
      </div>
    );
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">

      {/* 🔥 HEADER */}
      <h1 className="text-2xl text-gray-700 dark:text-gray-200 font-bold mb-4">Search</h1>

      {/* 🔍 SEARCH INPUT */}
      <div className="flex items-center w-full bg-gray-100 dark:bg-gray-800 rounded-xl px-3">
        <Search size={18} className="text-gray-500" />
        <input
          type="text"
          placeholder="Search users, tribes, communities..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="w-full p-3 bg-transparent outline-none"
        />
      </div>

      <div className="flex gap-2 overflow-x-auto mt-4">
        {["all","people","communities","posts"].map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-3 py-1 rounded ${
              activeTab === tab ? "bg-indigo-600 text-white" : "bg-gray-200 text-gray-700 dark:text-gray-300 dark:bg-gray-800"
            }`}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      {!query && (
        <div className="mt-6">
          <p className="text-gray-500 mb-2">🔥 Trending Searches</p>
          <div className="flex flex-wrap gap-2">
            {trending.map((t) => (
              <button
                key={t}
                onClick={() => setQuery(t)}
                className="px-3 py-1 bg-gray-200 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-full text-sm"
              >
                {t}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Search History */}
      {!query && history.length > 0 && (
        <div className="mt-6">
          <p className="text-gray-500 mb-2">🕒 Recent Searches</p>
          <div className="flex flex-wrap gap-2">
            {history.map((h) => (
              <button
                key={h}
                onClick={() => setQuery(h)}
                className="px-3 py-1 bg-gray-200 text-gray-700 dark:bg-gray-800 rounded-full text-sm"
              >
                {h}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 🔄 LOADING */}
      {loading && (
        <p className="mt-4 text-sm text-gray-500">Searching...</p>
      )}

      {/* 🔥 RESULTS */}
      {query && !loading && (
        <div className="mt-6 space-y-6">

          {/* USERS */}
          {results.users?.length > 0 && (
            <div>
              <h2 className="text-sm font-bold mb-2">👤 Users</h2>
              {results.users.map((u: any) => (
                <Link key={u.id} href={`/profile/${u.username}`}>
                  <div className="p-3 border rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800">
                    {u.username}
                  </div>
                </Link>
              ))}
            </div>
          )}

          {/* TRIBES */}
          {results.tribes?.length > 0 && (
            <div>
              <h2 className="text-sm font-bold mb-2">🔥 Tribes</h2>
              {results.tribes.map((t: any) => (
                <Link key={t.id} href={`/main/tribe/${t.id}`}>
                  <div className="p-3 border rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800">
                    {t.name}
                  </div>
                </Link>
              ))}
            </div>
          )}

          {/* COMMUNITIES */}
          {results.communities?.length > 0 && (
            <div>
              <h2 className="text-sm font-bold mb-2">💬 Communities</h2>
              {results.communities.map((c: any) => (
                <Link key={c.id} href={`/main/community/${c.id}`}>
                  <div className="p-3 border rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800">
                    {c.name}
                  </div>
                </Link>
              ))}
            </div>
          )}

          {/* Results */}
          {query && !loading && renderTabResults()}

          {/* NO RESULTS */}
          {results.users?.length === 0 &&
           results.tribes?.length === 0 &&
           results.communities?.length === 0 && (
            <p className="text-gray-500 text-sm">
              No results found for "{query}"
            </p>
          )}
        </div>
      )}
    </div>
  );
}