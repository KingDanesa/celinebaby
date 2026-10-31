import Image from "next/image";
import Link from "next/link";
import type { Dictionary } from "@/i18n";

type H = (p: string) => string;

/** Two big age tiles: video for "Малыши", photo for "Дети". */
export function HeroTiles({ t, href }: { t: Dictionary; href: H }) {
  return (
    <>
      <Link href={href("/catalog/newborn")} className="group relative block aspect-[4/5] overflow-hidden bg-pink-deep sm:aspect-auto sm:h-[72vh] sm:max-h-[760px] sm:min-h-[520px]">
        <video
          className="absolute inset-0 h-full w-full object-cover object-[center_60%] opacity-95 transition-transform duration-[1200ms] ease-soft group-hover:scale-[1.03]"
          autoPlay
          muted
          loop
          playsInline
          preload="metadata"
          poster="/video/babies-poster.jpg"
        >
          <source src="/video/babies.mp4" type="video/mp4" />
        </video>
        <div className="absolute inset-0 bg-pink-deep/35 mix-blend-multiply" />
        <div className="absolute inset-0 bg-gradient-to-t from-ink/35 via-transparent to-transparent" />
        <TileText title={t.home.newbornTitle} sub={t.home.newbornSub} />
      </Link>
      <Link href={href("/catalog/toddler")} className="group relative block aspect-[4/5] overflow-hidden bg-blue sm:aspect-auto sm:h-[72vh] sm:max-h-[760px] sm:min-h-[520px]">
        <Image src="/img/covers/deti.jpg" alt="" fill priority sizes="(max-width: 640px) 100vw, 50vw" className="object-cover object-[center_30%] transition-transform duration-[1200ms] ease-soft group-hover:scale-[1.03]" />
        <div className="absolute inset-0 bg-blue-deep/30 mix-blend-multiply" />
        <div className="absolute inset-0 bg-gradient-to-t from-ink/35 via-transparent to-transparent" />
        <TileText title={t.home.toddlerTitle} sub={t.home.toddlerSub} />
      </Link>
    </>
  );
}

function TileText({ title, sub }: { title: string; sub: string }) {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center text-center text-white [text-shadow:0_2px_30px_rgba(43,14,20,0.45)]">
      <h2 className="display-caps text-[56px] sm:text-[72px] lg:text-[96px]">{title}</h2>
      <p className="mt-3 text-[16px] font-medium sm:text-[20px]">{sub}</p>
    </div>
  );
}
