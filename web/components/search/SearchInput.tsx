"use client";

import { Search } from "lucide-react";

type Props = {
  value: string;
  onChange: (v: string) => void;
};

export default function SearchInput({
  value,
  onChange,
}: Props) {

  return (
    <div className="flex mt-6 items-center w-full bg-gray-200 dark:bg-gray-800 rounded-xl px-3">

      <Search
        size={18}
        className="text-gray-500"
      />

      <input
        type="text"
        placeholder="Search users, tribes, communities..."
        value={value}
        onChange={(e) =>
          onChange(e.target.value)
        }
        className="w-full p-3 bg-transparent text-gray-800 dark:text-gray-300 outline-none"
      />

    </div>
  );
}