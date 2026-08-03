"use client";

import { useState } from "react";
import Linkify from "linkify-react";

export default function MediaCaption({
  caption,
  more,
}:{
  caption?:string;
  more: () => void;
}) {

  if(!caption) return null;

  return(
    <div className="px-4 py-3 text-white">

      <Linkify
        options={{
          defaultProtocol:"https",
          target:"_blank",
          rel:"noopener noreferrer",
          attributes:{
            class:"text-indigo-400 underline"
          }
        }}
      >
        <p className="whitespace-pre-line mb-2 text-gray-600 dark:text-gray-300 line-clamp-3 overflow-hidden">
          {caption}
        </p>
      </Linkify>

      {caption.length > 150 && (
        <button
          onClick={more}
          className="mt-1 text-sm font-medium text-indigo-600 hover:underline"
        >
          More
        </button>
      )}

    </div>
  )
}