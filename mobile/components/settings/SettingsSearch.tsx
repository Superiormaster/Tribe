"use client";

import { Search } from "lucide-react";

interface SettingsSearchProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export default function SettingsSearch({
  value,
  onChange,
  placeholder = "Search settings",
}: SettingsSearchProps) {
  return (
    <div className="relative px-4 pb-4">
      <Search
        size={18}
        className="absolute left-8 top-5 -translate-y-1/2 text-gray-500"
      />

      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="
          w-full
          rounded-full
          dark:bg-gray-800
          bg-gray-100
          py-3
          pl-11
          pr-4
          text-sm
          text-gray-700
          dark:text-gray-300
          outline-none
          focus:ring-2
          focus:ring-blue-500
        "
      />
    </div>
  );
}