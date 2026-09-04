'use client';

type Props = {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onChat: () => void;
};

export default function CommunityTabs({
  activeTab,
  setActiveTab,
  onChat,
}: Props) {
  return (
    <div className="flex items-center justify-center gap-3 overflow-x-auto">

      {/* Main Tabs */}
      <div className="flex gap-2">
        {["posts", "pending", "members"].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium capitalize transition ${
              activeTab === tab
                ? "bg-indigo-600 text-white"
                : "bg-gray-200 text-gray-700 dark:bg-gray-800 dark:text-gray-200"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Special Chat Button */}
      <button
        onClick={onChat}
        className="px-4 py-1.5 rounded-lg text-sm font-semibold bg-indigo-500 text-white shadow-sm hover:bg-indigo-600 transition"
      >
        Chat
      </button>

    </div>
  );
}