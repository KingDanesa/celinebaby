import Image from "next/image";
import type { CSSProperties } from "react";
import type { Focus, HomeTile, Media } from "@/lib/home-types";
import { imageUrl, cn } from "@/lib/format";

const pos = (f: Focus) => `${f.x}% ${f.y}%`;

function One({ media, className, style, sizes, priority }: { media: Media; className: string; style: CSSProperties; sizes: string; priority?: boolean }) {
  if (media.kind === "video") {
    return (
      <video className={cn("absolute inset-0 h-full w-full object-cover", className)} style={style} autoPlay muted loop playsInline preload="metadata" poster={media.poster ? imageUrl(media.poster) : undefined}>
        <source src={imageUrl(media.src)} type="video/mp4" />
      </video>
    );
  }
  return <Image src={imageUrl(media.src)} alt="" fill priority={priority} sizes={sizes} className={cn("object-cover", className)} style={style} />;
}

/**
 * Photo or video of a home block. The focus point keeps the important part in view when the
 * block crops it; phones can have their own photo/video and their own focus point.
 */
export function BlockMedia({ tile, sizes, priority }: { tile: Pick<HomeTile, "media" | "mobile" | "focus" | "focusMobile">; sizes: string; priority?: boolean }) {
  const vars = { "--fm": pos(tile.focusMobile), "--fd": pos(tile.focus) } as CSSProperties;
  const responsive = "[object-position:var(--fm)] sm:[object-position:var(--fd)]";
  if (!tile.mobile) return <One media={tile.media} className={responsive} style={vars} sizes={sizes} priority={priority} />;
  return (
    <>
      <div className="absolute inset-0 sm:hidden">
        <One media={tile.mobile} className="" style={{ objectPosition: pos(tile.focusMobile) }} sizes="100vw" priority={priority} />
      </div>
      <div className="absolute inset-0 hidden sm:block">
        <One media={tile.media} className="" style={{ objectPosition: pos(tile.focus) }} sizes={sizes} priority={priority} />
      </div>
    </>
  );
}
