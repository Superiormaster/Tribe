'use client';

import PostCard from "@/components/PostCard";
import ReelCard from "@/components/ReelCard";
import ShareCard from "@/components/share/SharePostCard";
import type {
  Dispatch,
  SetStateAction,
} from "react";

type PendingItem = {
  type: "post" | "share";
  id: number;
};

type Props = {
  pendingPosts: any[];
  selectMode: boolean;
  selectedPosts: PendingItem[];
  toggleSelect: (item: PendingItem) => void;
  setActionType: (
    type: "approve" | "reject"
  ) => void;
  setSelectMode: Dispatch<SetStateAction<boolean>>;
  canModerate: boolean;
  handleModeration: (
    action: "approve" | "reject",
    items: PendingItem[]
  ) => void;
  currentUser: any;
  starredUserIds: Set<number>;
};

export default function CommunityPending({
  pendingPosts,
  selectMode,
  selectedPosts,
  toggleSelect,
  setActionType,
  setSelectMode,
  canModerate,
  handleModeration,
  currentUser,
  starredUserIds,
}: Props) {

  const isSelected = (
    type: "post" | "share",
    id: number
  ) => {
    return selectedPosts.some(
      item =>
        item.type === type &&
        Number(item.id) === Number(id)
    );
  };

  const getItemKey = (item: any): PendingItem => ({
    type: item.type === "share"
      ? "share"
      : "post",
    id: Number(item.id),
  });

  const selectAll = () => {
    if (selectedPosts.length === pendingPosts.length) {
      setSelectMode(false);

      // Clear all selections
      selectedPosts.forEach(item =>
        toggleSelect(item)
      );

      return;
    }

    setSelectMode(true);

    pendingPosts.forEach(item => {
      const selection = getItemKey(item);

      if (
        !isSelected(
          selection.type,
          selection.id
        )
      ) {
        toggleSelect(selection);
      }
    });
  };

  const clearSelection = () => {
    selectedPosts.forEach(item =>
      toggleSelect(item)
    );

    setSelectMode(false);
  };

  const handleAction = (
    action: "approve" | "reject"
  ) => {

    if (!selectedPosts.length) {
      return;
    }

    handleModeration(
      action,
      selectedPosts
    );
  };

  return (
    <div className="max-w-3xl mx-auto">

      {canModerate && (
        <div
          className="
            sticky
            top-0
            z-30
            flex
            items-center
            justify-between
            gap-3
            px-3
            py-3
            mb-4
            bg-gray-200
            dark:bg-gray-950
            border-b
            border-gray-200
            dark:border-gray-800
          "
        >
          <div>
            <h2 className="
              font-semibold
              text-gray-900
              dark:text-gray-100
            ">
              Pending posts
            </h2>

            <p className="
              text-xs
              text-gray-500
            ">
              {pendingPosts.length} pending
            </p>
          </div>

          <div className="flex items-center gap-2">

            {selectMode && (
              <button
                type="button"
                onClick={selectAll}
                className="
                  px-3
                  py-2
                  rounded-lg
                  text-sm
                  font-medium
                  bg-gray-100
                  dark:bg-gray-800
                  text-gray-800
                  dark:text-gray-200
                "
              >
                {selectedPosts.length === pendingPosts.length
                  ? "Clear all"
                  : "Select all"}
              </button>
            )}

            <button
              type="button"
              onClick={() => {
                if (selectMode) {
                  clearSelection();
                } else {
                  setSelectMode(true);
                }
              }}
              className="
                px-4
                py-2
                rounded-lg
                text-sm
                font-semibold
                bg-blue-600
                text-white
                hover:bg-blue-700
              "
            >
              {selectMode ? "Cancel" : "Select"}
            </button>

          </div>
        </div>
      )}

      {pendingPosts.length === 0 && (
        <div className="
          py-20
          text-center
          text-gray-500
        ">
          No pending posts.
        </div>
      )}

      <div className="space-y-4">

        {pendingPosts.map((item) => {

          const selection = getItemKey(item);

          const selected = isSelected(
            selection.type,
            selection.id
          );

          const handleSelect = () => {
            if (!selectMode) {
              return;
            }

            toggleSelect(selection);
          };

          return (
            <div
              key={`${selection.type}-${selection.id}`}
              className={`
                relative
                w-full mb-16
                max-w-full
                overflow-hidden
                rounded-xl
                ${
                  selectMode && selected
                    ? "ring-2 ring-blue-500"
                    : ""
                }
              `}
            >

              {selectMode && (
                <button
                  type="button"
                  aria-label={
                    selected
                      ? "Deselect item"
                      : "Select item"
                  }
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();

                    toggleSelect(selection);
                  }}
                  className="
                    absolute
                    top-3
                    right-3
                    z-20
                    w-9
                    h-9
                    rounded-full
                    bg-white
                    dark:bg-gray-900
                    border-2
                    border-gray-400
                    shadow-md
                    flex
                    items-center
                    justify-center
                  "
                >
                  {selected ? (
                    <span className="
                      w-6
                      h-6
                      rounded-full
                      bg-blue-600
                      text-white
                      text-sm
                      flex
                      items-center
                      justify-center
                    ">
                      ✓
                    </span>
                  ) : (
                    <span className="
                      w-6
                      h-6
                      rounded-full
                      bg-transparent"
                    />
                  )}
                </button>
              )}

              {item.type === "share" ? (

                <div
                  onClick={handleSelect}
                  className={
                    selectMode
                      ? "cursor-pointer"
                      : ""
                  }
                >
                  <ShareCard
                    share={item}
                    currentUser={currentUser}
                    hideStarButton
                    starredUserIds={starredUserIds}
                    onSelect={() =>
                      toggleSelect(selection)
                    }
                    onLongPress={() => {
                      setSelectMode(true);
                      toggleSelect(selection);
                    }}
                    setSelectMode={setSelectMode}
                  />
                </div>

              ) : item.content_type === "short_video" ? (

                <div
                  onClick={handleSelect}
                  className={
                    selectMode
                      ? "cursor-pointer"
                      : ""
                  }
                >
                  <ReelCard
                    post={item}
                    hideCommunityName
                    showManageButtons={canModerate}
                    isPending
                    canBulkSelect={selectMode}
                    isSelected={selected}
                    showPinnedLabel={false}

                    onSelect={() =>
                      toggleSelect(selection)
                    }

                    onLongPress={() => {
                      setSelectMode(true);
                      toggleSelect(selection);
                    }}

                    setSelectMode={
                      setSelectMode
                    }
                  />
                </div>

              ) : (

                <div
                  onClick={handleSelect}
                  className={
                    selectMode
                      ? "cursor-pointer"
                      : ""
                  }
                >
                  <PostCard
                    post={item}
                    hideCommunityName
                    hideStarButton
                    isPending
                    showManageButtons={
                      canModerate
                    }

                    canBulkSelect={
                      selectMode
                    }

                    isSelected={
                      selected
                    }

                    onSelect={() =>
                      toggleSelect(selection)
                    }

                    onLongPress={() => {
                      setSelectMode(true);
                      toggleSelect(selection);
                    }}

                    setSelectMode={
                      setSelectMode
                    }

                    canDelete={
                      canModerate
                    }

                    canEdit={
                      canModerate
                    }

                    canRepost={false}

                    onApprove={(id) =>
                      handleModeration(
                        "approve",
                        [{
                          type: "post",
                          id,
                        }]
                      )
                    }

                    onReject={(id) =>
                      handleModeration(
                        "reject",
                        [{
                          type: "post",
                          id,
                        }]
                      )
                    }
                  />
                </div>
              )}

            </div>
          );
        })}

      </div>

      {/* =========================
          BULK ACTION BAR
      ========================== */}
      {selectMode &&
        canModerate &&
        selectedPosts.length > 0 && (

        <div
          className="
            fixed
            bottom-0
            left-0
            right-0
            z-50
            bg-white
            dark:bg-gray-950
            border-t
            border-gray-200
            dark:border-gray-800
            shadow-xl
            px-4
            py-3
          "
        >

          <div className="
            max-w-3xl
            mx-auto
            flex
            items-center
            justify-between
            gap-3
          ">

            <div>
              <p className="
                font-semibold
                text-gray-900
                dark:text-white
              ">
                {selectedPosts.length} selected
              </p>

              <button
                type="button"
                onClick={clearSelection}
                className="
                  text-xs
                  text-gray-500
                  hover:underline
                "
              >
                Clear selection
              </button>
            </div>

            <div className="
              flex
              gap-2
            ">

              <button
                type="button"
                onClick={() =>
                  handleAction("reject")
                }
                className="
                  px-4
                  py-2
                  rounded-lg
                  bg-red-600
                  text-white
                  text-sm
                  font-semibold
                "
              >
                Reject
              </button>

              <button
                type="button"
                onClick={() =>
                  handleAction("approve")
                }
                className="
                  px-4
                  py-2
                  rounded-lg
                  bg-green-600
                  text-white
                  text-sm
                  font-semibold
                "
              >
                Approve
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}