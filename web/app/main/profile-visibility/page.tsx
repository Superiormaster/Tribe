"use client";

import { useEffect, useState } from "react";
import { Eye } from "lucide-react";

import { apiRequest } from "@/utils/api";
import Skeleton from "@/components/Skeleton";

export default function ProfileVisibilityPage() {
const [visibility, setVisibility] =
useState("public");

const [loading, setLoading] =
useState(true);

useEffect(() => {
loadSettings();
}, []);

const loadSettings = async () => {
try {
const data = await apiRequest(
"api/users/privacy-settings/"
);

  setVisibility(
    data.profile_visibility
  );
} catch (error) {
  console.error(error);
} finally {
  setLoading(false);
}

};

const updateVisibility = async (
value: string
) => {
try {
setVisibility(value);

  await apiRequest(
    "api/users/privacy-settings/",
    {
      method: "PATCH",
      data: {
        profile_visibility: value,
      },
    }
  );
} catch (error) {
  console.error(error);
}

};

const options = [
{
value: "public",
title: "Public",
description:
"Anyone can view your profile.",
},
{
value: "members",
title: "Members Only",
description:
"Only Tribe members can view your profile.",
},
{
value: "private",
title: "Private",
description:
"Only approved connections can view your profile.",
},
];

if (loading) {
return (
<div className="p-4">
<Skeleton />
</div>
);
}

return (
<div className="mx-auto mt-20 max-w-2xl p-4">
<div className="mb-8">
<h1 className="text-3xl font-bold text-gray-700 dark:text-gray-300">
Profile Visibility
</h1>

    <p className="mt-2 text-gray-500">
      Choose who can view your profile.
    </p>
  </div>

  <div className="space-y-3">
    {options.map((option) => (
      <button
        key={option.value}
        onClick={() =>
          updateVisibility(
            option.value
          )
        }
        className={`w-full rounded-xl border p-4 text-left ${
          visibility === option.value
            ? "border-indigo-600 bg-indigo-50 dark:bg-indigo-950"
            : "border-gray-300"
        }`}
      >
        <div className="flex gap-3">
          <Eye />
          <div>
            <h3 className="font-semibold">
              {option.title}
            </h3>

            <p className="text-sm text-gray-500">
              {option.description}
            </p>
          </div>
        </div>
      </button>
    ))}
  </div>
</div>

);
}