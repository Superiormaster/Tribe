import AppLink from "@/components/AppLink";
import { ChevronRight } from "lucide-react";
import { useState } from "react";

interface SettingsItemProps {
  icon: React.ReactNode;
  title: string;
  description?: string;
  href?: string;

  // NEW
  type?: "link" | "toggle";
  value?: boolean;
  onToggle?: (val: boolean) => void;
}

export default function SettingsItem({
  icon,
  title,
  description,
  href,
  type = "link",
  value = false,
  onToggle,
}: SettingsItemProps) {
  const [checked, setChecked] = useState(value);

  const handleToggle = () => {
    const newVal = !checked;
    setChecked(newVal);
    onToggle?.(newVal);
  };

  const content = (
    <div className="flex items-center justify-between py-4">
      <div className="flex items-center gap-4">
        <div className="text-gray-800 dark:text-gray-500 text-2xl">
          {icon}
        </div>

        <div>
          <h3 className="font-semibold text-[16px] text-gray-600 dark:text-gray-300">
            {title}
          </h3>

          {description && (
            <p className="text-sm text-gray-700 dark:text-gray-400">
              {description}
            </p>
          )}
        </div>
      </div>

      {/* RIGHT SIDE */}
      {type === "link" ? (
        <ChevronRight size={18} className="text-gray-700 dark:text-gray-200" />
      ) : (
        <div
          onClick={handleToggle}
          className={`w-11 h-6 flex items-center rounded-full p-1 cursor-pointer transition ${
            checked ? "bg-green-500" : "bg-gray-400"
          }`}
        >
          <div
            className={`h-4 w-4 bg-white rounded-full shadow-md transform transition ${
              checked ? "translate-x-5" : ""
            }`}
          />
        </div>
      )}
    </div>
  );

  if (href) {
    return <AppLink href={href}>{content}</AppLink>;
  }

  return content;
}