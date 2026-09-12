"use client";

import {
  ThumbsUp,
  MessageCircle,
  Share2,
  Repeat,
  ChartNoAxesColumn,
} from "lucide-react";

import { formatCount } from "@/utils/formatCount";

interface Props{
  liked:boolean;
  likes:number;
  comments:number;
  views:number;

  onLike:()=>void;
  onComment:()=>void;
  onShare:()=>void;
  onRepost:()=>void;
}

export default function MediaActions({
  liked,
  likes,
  comments,
  views,
  onLike,
  onComment,
  onShare,
  onRepost,
}:Props){

  return(

    <div className="flex items-center justify-around text-gray-500 p-4 border-t border-gray-600 dark:border-gray-800">

      <button
        onClick={onLike}
        className={`flex items-center gap-1 ${
          liked ? "text-blue-600":""
        }`}
      >
        <ThumbsUp size={20}/>
        {likes>0 && formatCount(likes)}
      </button>

      <button
        onClick={onComment}
        className="flex items-center gap-1"
      >
        <MessageCircle size={20}/>
        {formatCount(comments)}
      </button>

      <button
        onClick={onShare}
        className="flex items-center gap-1"
      >
        <Share2 size={20}/>
      </button>

      <div className="flex items-center gap-1">
        <ChartNoAxesColumn size={20}/>
        {formatCount(views)}
      </div>

    </div>

  );
}