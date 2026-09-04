'use client';

import {
  useRef,
  useState,
  useEffect,
  useMemo,
  useCallback,
} from "react";

import { Swiper, SwiperSlide } from "swiper/react";
import { Pagination } from "swiper/modules";

import "swiper/css";
import "swiper/css/pagination";

import {
  TransformWrapper,
  TransformComponent,
} from "react-zoom-pan-pinch";

import {
  normalizeMediaList,
  MediaItem,
} from "@/utils/chat/MediaNormalizer";

import { Reply } from "lucide-react";

import { useNetwork } from
  "@/components/networkConnection/NetworkContext";

interface PreviewViewerProps {
  files: any[];
  index: number;
  setIndex: (index: number | ((prev: number) => number)) => void;
  onClose: () => void;
  msg: any;
  onReply?: (msg: any) => void;
  isMine?: boolean;
}

export default function PreviewViewer({
  files,
  index,
  setIndex,
  onClose,
  msg,
  onReply,
  isMine,
}: PreviewViewerProps) {

  /*
   * =========================================================
   * NETWORK
   * =========================================================
   */

  const {
    isOnline,
    serverReachable,
    reconnecting,
    finishReconnect,
  } = useNetwork();


  /*
   * =========================================================
   * MEDIA
   * =========================================================
   */

  const media = useMemo<MediaItem[]>(() => {
    return normalizeMediaList(files);
  }, [files]);


  /*
   * =========================================================
   * REFS
   * =========================================================
   */

  const swiperRef =
    useRef<any>(null);

  const videoRef =
    useRef<HTMLVideoElement | null>(null);

  const startX =
    useRef(0);

  const deltaX =
    useRef(0);

  const dragging =
    useRef(false);

  const lastTime =
    useRef(0);

  const videoWasPlaying =
    useRef(false);

  /*
   * Prevent an old video's state from
   * affecting a newly selected video.
   */
  const videoSourceRef =
    useRef<string | null>(null);


  /*
   * =========================================================
   * STATE
   * =========================================================
   */

  const [isZoomed, setIsZoomed] =
    useState(false);

  const [videoError, setVideoError] =
    useState(false);

  const [videoLoading, setVideoLoading] =
    useState(false);


  /*
   * =========================================================
   * CURRENT MEDIA
   * =========================================================
   */

  const currentMedia =
    media[index] ?? null;


  /*
   * =========================================================
   * KEEP INDEX VALID
   *
   * IMPORTANT:
   * This runs after media is normalized.
   * No early return before hooks.
   * =========================================================
   */

  useEffect(() => {

    if (media.length === 0) {
      return;
    }

    if (index < 0) {
      setIndex(0);
      return;
    }

    if (index >= media.length) {
      setIndex(media.length - 1);
    }

  }, [
    media.length,
    index,
    setIndex,
  ]);


  /*
   * =========================================================
   * SYNC SWIPER WITH EXTERNAL INDEX
   * =========================================================
   */

  useEffect(() => {

    if (!swiperRef.current) {
      return;
    }

    if (
      index < 0 ||
      index >= media.length
    ) {
      return;
    }

    if (
      swiperRef.current.activeIndex !== index
    ) {
      swiperRef.current.slideTo(
        index,
        0
      );
    }

  }, [
    index,
    media.length,
  ]);


  /*
   * =========================================================
   * RESET ZOOM / VIDEO STATE WHEN MEDIA CHANGES
   * =========================================================
   */

  useEffect(() => {

    setIsZoomed(false);
    setVideoError(false);
    setVideoLoading(false);

    lastTime.current = 0;
    videoWasPlaying.current = false;

    videoSourceRef.current =
      currentMedia?.type === "video"
        ? currentMedia.src
        : null;

  }, [
    index,
    currentMedia?.src,
    currentMedia?.type,
  ]);


  /*
   * =========================================================
   * PRELOAD NEIGHBOURING MEDIA
   * =========================================================
   */

  useEffect(() => {

    const preload =
      (item?: MediaItem) => {

        if (!item?.src) {
          return;
        }

        if (item.type === "image") {

          const img =
            new Image();

          img.src = item.src;

          return;
        }

        if (item.type === "video") {

          const video =
            document.createElement("video");

          video.preload = "metadata";
          video.src = item.src;
        }
      };

    preload(media[index - 1]);
    preload(media[index + 1]);

  }, [
    index,
    media,
  ]);


  /*
   * =========================================================
   * VIDEO EVENT HANDLING
   * =========================================================
   */

  useEffect(() => {

    const video =
      videoRef.current;

    if (
      !video ||
      currentMedia?.type !== "video"
    ) {
      return;
    }

    const handleWaiting = () => {

      lastTime.current =
        video.currentTime;

      videoWasPlaying.current =
        !video.paused;

      setVideoLoading(true);
    };

    const handlePlaying = () => {

      setVideoLoading(false);
      setVideoError(false);
    };

    const handleCanPlay = () => {

      setVideoLoading(false);
    };

    const handleError = () => {

      lastTime.current =
        video.currentTime;

      videoWasPlaying.current =
        !video.paused;

      setVideoLoading(false);
      setVideoError(true);
    };

    const handlePause = () => {

      lastTime.current =
        video.currentTime;

      videoWasPlaying.current =
        false;
    };

    const handlePlay = () => {

      videoWasPlaying.current =
        true;
    };


    video.addEventListener(
      "waiting",
      handleWaiting
    );

    video.addEventListener(
      "playing",
      handlePlaying
    );

    video.addEventListener(
      "canplay",
      handleCanPlay
    );

    video.addEventListener(
      "error",
      handleError
    );

    video.addEventListener(
      "pause",
      handlePause
    );

    video.addEventListener(
      "play",
      handlePlay
    );


    return () => {

      video.removeEventListener(
        "waiting",
        handleWaiting
      );

      video.removeEventListener(
        "playing",
        handlePlaying
      );

      video.removeEventListener(
        "canplay",
        handleCanPlay
      );

      video.removeEventListener(
        "error",
        handleError
      );

      video.removeEventListener(
        "pause",
        handlePause
      );

      video.removeEventListener(
        "play",
        handlePlay
      );

    };

  }, [
    index,
    currentMedia?.src,
    currentMedia?.type,
  ]);


  /*
   * =========================================================
   * SAVE VIDEO POSITION WHEN NETWORK GOES OFFLINE
   * =========================================================
   */

  useEffect(() => {

    if (isOnline) {
      return;
    }

    const video =
      videoRef.current;

    if (!video) {
      return;
    }

    if (
      currentMedia?.type !== "video"
    ) {
      return;
    }

    lastTime.current =
      video.currentTime;

    videoWasPlaying.current =
      !video.paused;

  }, [
    isOnline,
    currentMedia?.type,
  ]);


  /*
   * =========================================================
   * RECOVER VIDEO AFTER NETWORK RETURNS
   * =========================================================
   */

  const recoverVideo =
    useCallback(() => {

      const video =
        videoRef.current;

      if (!video) {
        return;
      }

      if (
        currentMedia?.type !== "video"
      ) {
        return;
      }

      if (
        !isOnline ||
        !serverReachable
      ) {
        return;
      }


      const resumeTime =
        lastTime.current;

      const shouldResume =
        videoWasPlaying.current;


      setVideoError(false);
      setVideoLoading(true);


      /*
       * Reload the current resource.
       *
       * The src remains exactly the same.
       * We do NOT replace it with another URL
       * merely because the network went offline.
       */
      video.load();


      const restore = () => {

        try {

          if (
            Number.isFinite(
              resumeTime
            ) &&
            resumeTime > 0
          ) {

            video.currentTime =
              resumeTime;
          }


          if (shouldResume) {

            video.play()
              .then(() => {

                setVideoLoading(false);

                finishReconnect();

              })
              .catch(() => {

                /*
                 * Browser autoplay policy may
                 * reject automatic playback.
                 *
                 * The controls remain available.
                 */
                setVideoLoading(false);

                finishReconnect();
              });

          } else {

            setVideoLoading(false);

            finishReconnect();
          }

        } catch {

          setVideoLoading(false);

          finishReconnect();
        }
      };


      if (video.readyState >= 1) {

        restore();

      } else {

        video.addEventListener(
          "loadedmetadata",
          restore,
          { once: true }
        );
      }

    }, [
      currentMedia?.src,
      currentMedia?.type,
      isOnline,
      serverReachable,
      finishReconnect,
    ]);


  /*
   * =========================================================
   * NETWORK RECONNECTED EVENT
   * =========================================================
   */

  useEffect(() => {

    const handleReconnect =
      () => {

        recoverVideo();
      };


    window.addEventListener(
      "network-reconnected",
      handleReconnect
    );


    return () => {

      window.removeEventListener(
        "network-reconnected",
        handleReconnect
      );

    };

  }, [
    recoverVideo,
  ]);


  /*
   * =========================================================
   * RECOVER IF VIDEO FAILED WHILE NETWORK WAS BAD
   * =========================================================
   */

  useEffect(() => {

    if (!isOnline) {
      return;
    }

    if (!serverReachable) {
      return;
    }

    if (!videoError) {
      return;
    }

    recoverVideo();

  }, [
    isOnline,
    serverReachable,
    videoError,
    recoverVideo,
  ]);


  /*
   * =========================================================
   * SWIPE
   * =========================================================
   */

  const changeIndex =
    useCallback(
      (
        updater:
          | number
          | ((prev: number) => number)
      ) => {

        requestAnimationFrame(() => {
          setIndex(updater);
        });

      },
      [setIndex]
    );


  const onStart =
    useCallback(
      (e: any) => {

        /*
         * Don't start gallery dragging while
         * an image is zoomed.
         */
        if (isZoomed) {
          return;
        }

        dragging.current = true;

        startX.current =
          e.clientX ??
          e.touches?.[0]?.clientX ??
          0;

      },
      [isZoomed]
    );


  const onMove =
    useCallback(
      (e: any) => {

        if (
          !dragging.current ||
          media.length <= 1 ||
          isZoomed
        ) {
          return;
        }

        const currentX =
          e.clientX ??
          e.touches?.[0]?.clientX ??
          0;

        deltaX.current =
          currentX - startX.current;

      },
      [
        media.length,
        isZoomed,
      ]
    );


  const onEnd =
    useCallback(() => {

      if (isZoomed) {
        dragging.current = false;
        deltaX.current = 0;
        return;
      }

      dragging.current = false;

      const threshold = 80;


      if (
        deltaX.current > threshold
      ) {

        changeIndex(
          (previous) =>
            Math.max(
              previous - 1,
              0
            )
        );
      }


      if (
        deltaX.current < -threshold
      ) {

        changeIndex(
          (previous) =>
            Math.min(
              previous + 1,
              media.length - 1
            )
        );
      }


      deltaX.current = 0;

    }, [
      changeIndex,
      media.length,
      isZoomed,
    ]);


  /*
   * =========================================================
   * EMPTY STATE
   *
   * THIS IS THE FIRST CONDITIONAL RETURN.
   *
   * ALL HOOKS ARE ALREADY ABOVE IT.
   * =========================================================
   */

  if (!currentMedia) {
    return null;
  }


  /*
   * =========================================================
   * RENDER
   * =========================================================
   */

  return (
    <div
      className="
        fixed
        inset-0
        bg-black
        z-[999]
        flex
        flex-col
      "
      onTouchStart={onStart}
      onTouchMove={onMove}
      onTouchEnd={onEnd}
      onMouseDown={onStart}
      onMouseMove={onMove}
      onMouseUp={onEnd}
    >

      {/* =====================================================
          HEADER
      ====================================================== */}

      <div
        className="
          fixed
          top-0
          left-0
          right-0
          z-[1000]
          border-b
          border-white/10
          bg-black/80
          text-white
          px-3
          py-3
          flex
          items-center
          justify-between
        "
      >

        {/* COUNTER */}

        <div className="text-sm text-gray-300">

          {media.length > 1 && (
            <span>
              {index + 1} / {media.length}
            </span>
          )}

        </div>


        {/* USER */}

        <p
          className="
            text-sm
            font-semibold
            absolute
            left-1/2
            -translate-x-1/2
          "
        >
          {isMine
            ? "You"
            : msg?.username}
        </p>


        {/* CLOSE */}

        <button
          onClick={(e) => {

            e.stopPropagation();

            onClose();

          }}
          className="
            text-white
            text-lg
            px-2
          "
        >
          ✕
        </button>

      </div>


      {/* =====================================================
          MEDIA
      ====================================================== */}

      <div
        className="
          flex-1
          min-h-0
          pt-12
        "
      >

        <Swiper
          onSwiper={(swiper) => {

            swiperRef.current =
              swiper;

            swiper.slideTo(
              index,
              0
            );

          }}

          allowTouchMove={
            !isZoomed
          }

          modules={[
            Pagination,
          ]}

          pagination={{
            clickable: true,
          }}

          spaceBetween={0}

          slidesPerView={1}

          onSlideChange={(
            swiper
          ) => {

            setIndex(
              swiper.activeIndex
            );

            setIsZoomed(false);

          }}

          className="
            w-full
            h-full
          "
        >

          {media.map(
            (item, i) => {

              const itemIsImage =
                item.type === "image";

              const itemIsVideo =
                item.type === "video";

              return (
                <SwiperSlide
                  key={`${item.src}-${i}`}
                  className="
                    !flex
                    !items-center
                    !justify-center
                    bg-black
                  "
                >

                  {/* =================================================
                      IMAGE
                  ================================================== */}

                  {itemIsImage && (

                    <div
                      className="
                        w-full
                        h-full
                        flex
                        items-center
                        justify-center
                        overflow-hidden
                      "
                    >

                      <TransformWrapper
                        minScale={1}
                        maxScale={5}
                        centerOnInit

                        pinch={{
                          step: 5,
                        }}

                        doubleClick={{
                          mode: "toggle",
                        }}

                        panning={{
                          disabled:
                            !isZoomed,
                        }}

                        wheel={{
                          disabled: true,
                        }}

                        onTransform={({
                          state,
                        }) => {

                          setIsZoomed(
                            state.scale > 1
                          );

                        }}
                      >

                        <TransformComponent
                          wrapperClass="
                            !w-full
                            !h-full
                            !flex
                            !items-center
                            !justify-center
                          "
                          contentClass="
                            !flex
                            !items-center
                            !justify-center
                            !w-full
                            !h-full
                          "
                        >

                          <img
                            src={item.src}
                            alt=""
                            draggable={false}
                            className="
                              block
                              max-w-full
                              max-h-[80vh]
                              object-contain
                              select-none
                            "
                          />

                        </TransformComponent>

                      </TransformWrapper>
                    </div>
                  )}

                  {itemIsVideo && (
                    <div
                      className="
                        relative
                        w-full
                        h-full
                        flex
                        items-center
                        justify-center
                      "
                    >

                      <video
                        key={item.src}
                        ref={
                          i === index
                            ? videoRef
                            : undefined
                        }
                        src={item.src}
                        poster={
                          item.thumbnail ||
                          undefined
                        }
                        controls
                        playsInline
                        preload="metadata"
                        className="
                          max-w-full
                          max-h-[80vh]
                          object-contain
                        "
                      />

                      {/* LOADING / RECONNECTING */}
                      {i === index &&
                        (
                          reconnecting ||
                          videoLoading
                        ) && (

                        <div
                          className="
                            absolute
                            inset-0
                            bg-black/40
                            flex
                            items-center
                            justify-center
                            pointer-events-none
                          "
                        >

                          <div
                            className="
                              w-10
                              h-10
                              rounded-full
                              border-4
                              border-white
                              border-t-transparent
                              animate-spin
                            "
                          />
                        </div>
                      )}

                      {/* OFFLINE */}
                      {i === index &&
                        videoError &&
                        !isOnline && (
                        <div
                          className="
                            absolute
                            inset-0
                            flex
                            items-center
                            justify-center
                            pointer-events-none
                          "
                        >

                          <div
                            className="
                              bg-black/70
                              text-white
                              px-4
                              py-2
                              rounded-lg
                              text-sm
                            "
                          >
                            Waiting for connection…
                          </div>
                        </div>
                      )}

                      {/* SERVER UNREACHABLE */}
                      {i === index &&
                        videoError &&
                        isOnline &&
                        !serverReachable && (
                        <div
                          className="
                            absolute
                            inset-0
                            flex
                            items-center
                            justify-center
                            pointer-events-none
                          "
                        >

                          <div
                            className="
                              bg-black/70
                              text-white
                              px-4
                              py-2
                              rounded-lg
                              text-sm
                            "
                          >
                            Reconnecting…
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </SwiperSlide>
              );
            }
          )}
        </Swiper>

      </div>

      {msg?.caption && (
        <div
          className="
            p-3
            text-white
            text-sm
            bg-black/60
          "
        >
          {msg.caption}
        </div>
      )}

      <button
        onClick={() => {
          onReply?.(msg);
          onClose();
        }}

        className="
          absolute
          bottom-20
          right-4
          z-[1001]
          bg-white
          text-black
          px-4
          py-2
          rounded-full
          flex
          items-center
          gap-2
          shadow-lg
        "
      >

        <Reply size={16} />

        Reply

      </button>

    </div>
  );
}