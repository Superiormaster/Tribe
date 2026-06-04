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
    <div className="flex justify-center overflow-x-auto gap-3">

      {["posts", "pending", "members"].map((tab) => (
        <button
          key={tab}
          onClick={() => setActiveTab(tab)}
          className={`px-3 py-1 rounded ${
            activeTab === tab
              ? "bg-indigo-600 text-white"
              : "bg-gray-200 text-gray-700 dark:text-gray-200 dark:bg-gray-800"
          }`}
        >
          {tab}
        </button>
      ))}

      <button
        onClick={onChat}
        className="px-3 py-1 bg-indigo-600 text-white rounded"
      >
        Chat
      </button>

    </div>
  );
}