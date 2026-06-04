"use client";

import { Search } from "lucide-react";

type Props = {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
};

export default function SearchFilter({
  value,
  onChange,
  placeholder = "Search..."
}: Props) {
  return (
    <div className="flex mt-6 items-center w-full bg-gray-200 dark:bg-gray-800 rounded-xl px-3">
      <Search
        size={18}
        className="text-gray-500"
      />

      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="
          w-full
          p-3
          rounded-xl
          bg-gray-200
          text-gray-700
          dark:text-gray-200
          dark:bg-gray-800
          outline-none
        "
      />
    </div>
  );
}