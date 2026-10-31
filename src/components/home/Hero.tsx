import Image from "next/image";
import Link from "next/link";
import type { Dictionary } from "@/i18n";
import { Parallax } from "@/components/ui/Parallax";

type H = (p: string) => string;

/** Two big age tiles: video for "Малыши", photo for "Дети". */
export function HeroTiles({ t, href }: { t: Dictionary; href: H }) {
  const tile = "group relative block aspect-[4/5] overflow-hidden sm:aspect-auto sm:h-[72vh] sm:max-h-[760px] sm:min-h-[520px]";
  return (
    <>
      <Link href={href("/catalog/newborn")} className={`${tile} bg-pink-deep`}>
        <Parallax strength={0.07}>
          <video
            className="absolute inset-0 h-full w-full object-cover object-[center_45%] opacity-95"
            autoPlay
            muted
            loop
            playsInline
            preload="metadata"
            poster="/video/babies-poster.jpg"
          >
            <source src="/video/babies.mp4" type="video/mp4" />
          </video>
        </Parallax>
        <div className="absolute inset-0 bg-pink-deep/35 mix-blend-multiply transition-opacity duration-700 group-hover:opacity-60" />
        <div className="absolute inset-0 bg-gradient-to-t from-ink/35 via-transparent to-transparent" />
        <TileText title={t.home.newbornTitle} sub={t.home.newbornSub} delay={0} />
      </Link>
      <Link href={href("/catalog/toddler")} className={`${tile} bg-blue`}>
        <Parallax strength={0.07}>
          <Image src="/img/covers/deti.jpg" alt="" fill priority sizes="(max-width: 640px) 100vw, 50vw" className="object-cover object-[center_30%]" />
        </Parallax>
        <div className="absolute inset-0 bg-blue-deep/30 mix-blend-multiply transition-opacity duration-700 group-hover:opacity-60" />
        <div className="absolute inset-0 bg-gradient-to-t from-ink/35 via-transparent to-transparent" />
        <TileText title={t.home.toddlerTitle} sub={t.home.toddlerSub} delay={180} />
      </Link>
    </>
  );
}

function TileText({ title, sub, delay }: { title: string; sub: string; delay: number }) {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center text-center text-white [text-shadow:0_2px_30px_rgba(43,14,20,0.45)]">
      <h2 className="display-caps title-in text-[56px] sm:text-[clamp(40px,8vw,96px)]" style={{ animationDelay: `${delay}ms` }}>
        {title}
      </h2>
      <p className="animate-fade-up mt-3 text-[16px] font-medium sm:text-[20px]" style={{ animationDelay: `${delay + 500}ms` }}>
        {sub}
      </p>
    </div>
  );
}
