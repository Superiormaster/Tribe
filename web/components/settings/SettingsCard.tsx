interface SettingsCardProps {
  title: string;
  description?: string;
  buttonText?: string;
  avatar?: string;
  onClick?: () => void;
}

export default function SettingsCard({
  title,
  description,
  buttonText,
  avatar,
  onClick,
}: SettingsCardProps) {
  return (
    <div className="rounded-xl border-indigo-600 border dark:bg-gray-900 bg-white p-4">
      <div className="flex gap-3">
        <img
          src={avatar || "/default-avatar.png"}
          alt=""
          className="h-14 w-14 rounded-full object-cover"
        />

        <div className="flex-1 min-w-0">
          <h3 className="font-bold text-lg text-gray-700 dark:text-gray-300 truncate">
            {title}
          </h3>
        
          {description && (
            <p className="text-gray-500 truncate">
              {description}
            </p>
          )}
        </div>
      </div>

      {buttonText && (
        <button
          onClick={onClick}
          className="mt-4 w-full rounded-xl text-gray-700 dark:text-gray-300 dark:bg-gray-600 bg-gray-200 py-3 font-semibold"
        >
          {buttonText}
        </button>
      )}
    </div>
  );
}