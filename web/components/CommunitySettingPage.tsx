"use client";

import { useEffect, useRef, useState } from "react";
import { apiRequest } from "@/utils/api";
import Skeleton from "@/components/Skeleton";

export default function CommunitySettingsPage({
  communityId,
}: {
  communityId: string;
}) {
  const [community, setCommunity] = useState<any>({
    moderators: [],
    owner: {},
    admin: {},
  });

  const [loading, setLoading] = useState(true);
  const [isPlaying, setIsPlaying] = useState(true);
  const [isMuted, setIsMuted] = useState(true);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    load();
  }, []);

  const load = async () => {
    const data = await apiRequest(
      `api/communities/${communityId}/settings/`
    );

    setCommunity(data);
    setLoading(false);
  };

  const updateSettings = async () => {
    await apiRequest(
      `api/communities/${communityId}/settings/`,
      {
        method: "PATCH",
        data: {
          name: community.name,
          description: community.description,
          cover_image: community.cover_image,
          intro_video: community.intro_video,

          require_post_approval: community.require_post_approval,
          join_approval_required: community.join_approval_required,
        },
      }
    );

    alert("Updated successfully");
  };

  if (loading) return <Skeleton />;

return (
<div className="max-w-xl text-gray-600 dark:text-gray-300 mx-auto my-20 p-4 space-y-4">

<h1 className="text-2xl text-gray-700 dark:text-white font-bold">Community Settings</h1>  

  <div className="flex items-center gap-3 mt-4">  

    {/* INTRO VIDEO */}
      <div className="relative h-72 w-full overflow-hidden border bg-black rounded-lg">
        {community.intro_video && (
          <video
            ref={videoRef}
            src={community.intro_video}
            autoPlay
            muted={isMuted}
            playsInline
            className="w-full h-full object-cover"
          />
        )}

        <div className="absolute bottom-3 right-3 flex gap-2">
          <button
            onClick={() => {
              if (!videoRef.current) return;
              isPlaying ? videoRef.current.pause() : videoRef.current.play();
              setIsPlaying(!isPlaying);
            }}
            className="bg-black/60 text-white px-3 py-1 rounded-full text-xs"
          >
            {isPlaying ? "⏸ Pause" : "▶ Play"}
          </button>

          <button
            onClick={() => {
              if (!videoRef.current) return;
              videoRef.current.muted = !isMuted;
              setIsMuted(!isMuted);
            }}
            className="bg-black/60 text-white px-3 py-1 rounded-full text-xs"
          >
            {isMuted ? "🔇" : "🔊"}
          </button>

          <button
            onClick={() => {
              if (!videoRef.current) return;
              videoRef.current.currentTime = 0;
              videoRef.current.play();
              setIsPlaying(true);
            }}
            className="bg-black/60 text-white px-3 py-1 rounded-full text-xs"
          >
            🔁
          </button>
        </div>
      </div>
    
    <label className="cursor-pointer p-2 bg-indigo-600 text-white rounded-full">  
      +  
      <input  
        type="file"  
        hidden  
        accept="video/*"  
        onChange={(e) => {  
          const file = e.target.files?.[0];  
          if (!file) return;  
    
          const url = URL.createObjectURL(file);  
    
          setCommunity({  
            ...community,  
            intro_video: url,  
          });  
        }}  
      />  
    </label>  
  </div>  

  <div className="flex items-center gap-3">  
    <div className="relative w-16 h-16 rounded-full overflow-hidden border">  
      {community.cover_image ? (  
        <img  
          src={community.cover_image}  
          className="w-full h-full object-cover"  
        />  
      ) : (  
        <div className="w-full h-full bg-gray-200" />  
      )}  
    </div>  
    
    <label className="cursor-pointer p-2 bg-indigo-600 text-white rounded-full">  
      +  
      <input  
        type="file"  
        hidden  
        onChange={(e) => {  
          const file = e.target.files?.[0];  
          if (!file) return;  
    
          const url = URL.createObjectURL(file);  
    
          setCommunity({  
            ...community,  
            cover_image: url,  
          });  
        }}  
      />  
    </label>  
  </div>  

  <div>  
    <p className="text-xl font-medium text-gray-700 dark:text-white">Name</p>  
    <input  
      value={community.name}  
      onChange={(e) =>  
        setCommunity({ ...community, name: e.target.value })  
      }  
      className="w-full bg-indigo-200 text-gray-700 dark:text-white dark:bg-indigo-900 p-2 border rounded"  
    />  
  </div>  

  <div>  
    <p className="text-xl font-medium text-gray-700 dark:text-white">Description</p>  
    <textarea  
      value={community.description}  
      onChange={(e) =>  
        setCommunity({ ...community, description: e.target.value })  
      }  
      className="w-full bg-indigo-200 text-gray-700 dark:text-white dark:bg-indigo-900 p-2 border rounded"  
    />  
  </div>  

  {/* APPROVAL TOGGLE */}  
  <label className="flex items-center gap-2">  
    <input  
      type="checkbox"  
      checked={community.require_post_approval}  
        onChange={(e) =>
            setCommunity({
              ...community,
              require_post_approval: e.target.checked,
            })
        }
    />  
    Require Post Approval  
  </label>  

  <label className="flex items-center gap-2">  
    <input  
      type="checkbox"  
      checked={community.join_approval_required}  
      onChange={(e) =>  
        setCommunity({  
          ...community,  
          join_approval_required:  
            e.target.checked  
        })  
      }  
    />  
    
    Require Join Approval  
  </label>  

  <p className="dark:text-gray-200 text-gray-700">  
    Owner: {community.owner?.username}  
  </p>  

  <p className="dark:text-gray-200 text-gray-700">Admin: {community.admin.username}</p>  
    
  <div>  
    <h3 className="dark:text-gray-200 text-gray-700">Moderators ({community.moderators.length}/5)</h3>  
    
    {community.moderators?.map((m: any) => (  
      <div className="dark:text-gray-400 text-gray-500" key={m.id}>  
        {m.username}  
      </div>  
    ))}  
  </div>  

  <button  
    onClick={updateSettings}  
    className="bg-blue-500 text-white w-full p-2 rounded"  
  >  
    Save Changes  
  </button>  

  <button className="bg-red-500 text-white w-full p-2 rounded">  
    Delete Community  
  </button>  
</div>

);
}
