"use client";

type MentionMember = {
  id: number;
  username: string;
  avatar?: string | null;
};

type Props = {
  members: MentionMember[];
  loading: boolean;
  hasNext: boolean;
  onSelect: (member: MentionMember) => void;
  onLoadMore: () => void;
  mentionAll?: boolean;
};

export default function MentionDropdown({
  members,
  loading,
  hasNext,
  onSelect,
  onLoadMore,
  mentionAll,
}: Props) {
  return (
    <div
      className="
        w-full
        max-h-56
        overflow-y-auto
        overscroll-contain
        rounded-xl
        border
        border-gray-200
        dark:border-gray-700
        bg-white
        dark:bg-[#202c33]
        shadow-2xl
      "
    >
      {/* @everyone */}
      {mentionAll && (
        <button
          type="button"
          onClick={() =>
            onSelect({
              id: -1,
              username: "all",
            })
          }
          className="
            w-full
            flex
            items-center
            gap-3
            px-4
            py-3
            text-left
            hover:bg-gray-100
            dark:hover:bg-[#2a3942]
          "
        >
          <div
            className="
              w-9
              h-9
              shrink-0
              rounded-full
              bg-indigo-600
              flex
              items-center
              justify-center
              text-white
              font-bold
            "
          >
            @
          </div>

          <div className="min-w-0">
            <p className="font-medium text-gray-900 dark:text-white">
              Everyone
            </p>

            <p className="text-xs text-gray-500 dark:text-gray-400">
              Mention all community members
            </p>
          </div>
        </button>
      )}

      {/* Members */}
      {!mentionAll &&
        members.map((member) => (
          <button
            key={member.id}
            type="button"
            onClick={() => onSelect(member)}
            className="
              w-full
              flex
              items-center
              gap-3
              px-4
              py-3
              text-left
              hover:bg-gray-100
              dark:hover:bg-[#2a3942]
            "
          >
            {member.avatar ? (
              <img
                src={member.avatar}
                alt=""
                className="
                  w-9
                  h-9
                  shrink-0
                  rounded-full
                  object-cover
                "
              />
            ) : (
              <div
                className="
                  w-9
                  h-9
                  shrink-0
                  rounded-full
                  bg-gray-500
                  flex
                  items-center
                  justify-center
                  text-white
                  font-medium
                "
              >
                {member.username[0]?.toUpperCase()}
              </div>
            )}

            <span className="text-sm text-gray-900 dark:text-white truncate">
              @{member.username}
            </span>
          </button>
        ))}

      {/* Loading */}
      {loading && (
        <div className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
          Searching members...
        </div>
      )}

      {/* Load more */}
      {!loading && hasNext && !mentionAll && (
        <button
          type="button"
          onClick={onLoadMore}
          className="
            w-full
            py-3
            text-sm
            text-indigo-500
            hover:bg-gray-100
            dark:hover:bg-[#2a3942]
          "
        >
          Load more
        </button>
      )}

      {/* Empty */}
      {!loading && !mentionAll && members.length === 0 && (
        <div className="px-4 py-4 text-sm text-gray-500 dark:text-gray-400">
          No members found
        </div>
      )}
    </div>
  );
}