"use client";

import { Swiper, SwiperSlide } from "swiper/react";
import { Pagination } from "swiper/modules";

import "swiper/css";
import "swiper/css/pagination";
import { useEffect, useRef, useState } from "react";

import {
  TransformWrapper,
  TransformComponent,
} from "react-zoom-pan-pinch";

interface Props {
  media: any[];
  index: number;
  setIndex: (i: number) => void;
}

export default function MediaCarousel({
  media,
  index,
  setIndex,
}: Props) {
  const [isZoomed, setIsZoomed] = useState(false);
  const swiperRef = useRef<any>(null);
  
  useEffect(() => {
    if (swiperRef.current) {
      swiperRef.current.slideTo(index, 0);
    }
  }, [index]);
  
  return (
    <Swiper
      allowTouchMove={!isZoomed}
      modules={[Pagination]}
      initialSlide={index}
      pagination={{
        clickable: true,
      }}
      spaceBetween={0}
      slidesPerView={1}
      onSlideChange={(swiper) => {
        setIndex(swiper.activeIndex);
        setIsZoomed(false);
      }}
      className="w-full h-full"
    >
      {media.map((item, i) => (
        <SwiperSlide
          key={i}
          className="!flex !items-center !justify-center bg-black"
        >
          {item.media_type === "image" ? (
            <div className="w-full h-full flex items-center justify-center overflow-hidden">
              <TransformWrapper
                minScale={1}
                maxScale={5}
                centerOnInit
                pinch={{ step: 5 }}
                doubleClick={{ mode: "toggle" }}
                panning={{ disabled: !isZoomed }}
                wheel={{ disabled: true }}
                onTransform={({ state }) => {
                  setIsZoomed(state.scale > 1);
                }}
              >
                <TransformComponent
                  wrapperClass="!w-full !h-full !flex !items-center !justify-center"
                  contentClass="!flex !items-center !justify-center !w-full !h-full"
                >
                  <img
                    src={item.file_url}
                    draggable={false}
                    className="block max-w-full max-h-full object-contain select-none"
                  />
                </TransformComponent>
              </TransformWrapper>
            </div>
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <video
                src={item.file_url}
                controls
                playsInline
                autoPlay
                className="max-w-full max-h-full object-contain"
              />
            </div>
          )}
        </SwiperSlide>
      ))}
    </Swiper>
  );
}