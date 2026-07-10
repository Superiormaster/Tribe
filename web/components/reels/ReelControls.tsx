import { Pause, Play } from "lucide-react";

interface Props {
    show: boolean;
    video: HTMLVideoElement | null;
    playing: boolean;
    setPlaying: React.Dispatch<React.SetStateAction<boolean>>;
}

export default function ReelControls({
    show,
    video,
    playing,
    setPlaying,
}: Props) {

    if (!show) return null;

    const seek = (seconds: number) => {

        if (!video) return;

        video.currentTime = Math.max(
            0,
            Math.min(
                video.duration || 0,
                video.currentTime + seconds
            )
        );

    };

    return (

        <div className="absolute inset-0 flex items-center justify-center z-30">

            <div className="flex items-center gap-10">

                <button
                    className="bg-black/50 text-white px-2 py-1 rounded-full backdrop-blur-sm"
                    onClick={(e) => {
                        e.stopPropagation();
                        seek(-10);
                    }}
                >
                    -10s
                </button>

                <button
                    className="bg-black/60 p-4 rounded-full backdrop-blur-sm"
                    onClick={(e) => {

                        e.stopPropagation();

                        if (!video) return;

                        if (video.paused) {
                            video.play();
                            setPlaying(true);
                        } else {
                            video.pause();
                            setPlaying(false);
                        }

                    }}
                >
                    {playing
                        ? <Pause className="w-8 h-8 text-white"/>
                        : <Play className="w-8 h-8 text-white"/>
                    }
                </button>

                <button
                    className="bg-black/50 text-white px-2 py-1 rounded-full backdrop-blur-sm"
                    onClick={(e) => {
                        e.stopPropagation();
                        seek(10);
                    }}
                >
                    +10s
                </button>

            </div>

        </div>

    );

}