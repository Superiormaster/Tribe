"use client";

type Props = {
  activeTab: string;
  setActiveTab: (v: string) => void;
};

const tabs = [
  {
    key: "all",
    label: "✨ All",
  },
  {
    key: "people",
    label: "👤 People",
  },
  {
    key: "tribes",
    label: "🔥 Tribes",
  },
  {
    key: "communities",
    label: "💬 Communities",
  },
  {
    key: "posts",
    label: "📝 Posts",
  },
];

export default function SearchTabs({
  activeTab,
  setActiveTab,
}: Props) {

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">

      {tabs.map((tab) => (
        <button
          key={tab.key}
          onClick={() => setActiveTab(tab.key)}
          className={`
            w-full
            rounded-2xl
            px-4
            py-3
            text-sm
            font-semibold
            transition-all
            duration-200
            border

            ${
              activeTab === tab.key
                ? `
                  bg-indigo-600
                  text-white
                  border-indigo-600
                  shadow-lg
                  scale-[0.98]
                `
                : `
                  bg-gray-100
                  dark:bg-gray-900
                  text-gray-700
                  dark:text-gray-300
                  border-gray-200
                  dark:border-gray-800
                  hover:bg-gray-200
                  dark:hover:bg-gray-800
                `
            }
          `}
        >
          {tab.label}
        </button>
      ))}

    </div>
  );
}