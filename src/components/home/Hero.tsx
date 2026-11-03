import Link from "next/link";
import type { HomeContent } from "@/lib/home-types";
import { pick } from "@/lib/home-types";
import { Parallax } from "@/components/ui/Parallax";
import { BlockMedia } from "./BlockMedia";

type H = (p: string) => string;
export const linkTo = (link: string, href: H) => (link.startsWith("/") ? href(link) : link);

/** Two big age tiles ("Малыши", "Дети"). */
export function HeroTiles({ home, locale, href }: { home: HomeContent; locale: string; href: H }) {
  const tile = "group relative block aspect-[4/5] overflow-hidden sm:aspect-auto sm:h-[72vh] sm:max-h-[760px] sm:min-h-[520px]";
  const { newborn, toddler } = home.tiles;
  return (
    <>
      <Link href={linkTo(newborn.link, href)} className={`${tile} bg-pink-deep`}>
        <Parallax strength={0.07}>
          <BlockMedia tile={newborn} priority sizes="(max-width: 640px) 100vw, 50vw" />
        </Parallax>
        <div className="absolute inset-0 bg-pink-deep/15 mix-blend-multiply transition-opacity duration-700 group-hover:opacity-0" />
        <div className="absolute inset-0 bg-gradient-to-t from-ink/40 via-ink/5 to-transparent" />
        <TileText title={pick(newborn.title, locale)} sub={pick(newborn.sub, locale)} delay={0} />
      </Link>
      <Link href={linkTo(toddler.link, href)} className={`${tile} bg-blue`}>
        <Parallax strength={0.07}>
          <BlockMedia tile={toddler} priority sizes="(max-width: 640px) 100vw, 50vw" />
        </Parallax>
        <div className="absolute inset-0 bg-blue-deep/30 mix-blend-multiply transition-opacity duration-700 group-hover:opacity-60" />
        <div className="absolute inset-0 bg-gradient-to-t from-ink/35 via-transparent to-transparent" />
        <TileText title={pick(toddler.title, locale)} sub={pick(toddler.sub, locale)} delay={180} />
      </Link>
    </>
  );
}

function TileText({ title, sub, delay }: { title: string; sub: string; delay: number }) {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center px-4 text-center text-white [text-shadow:0_2px_30px_rgba(43,14,20,0.45)]">
      <h2 className="display-caps title-in text-[56px] sm:text-[clamp(40px,8vw,96px)]" style={{ animationDelay: `${delay}ms` }}>
        {title}
      </h2>
      {sub && (
        <p className="animate-fade-up mt-3 text-[16px] font-medium sm:text-[20px]" style={{ animationDelay: `${delay + 500}ms` }}>
          {sub}
        </p>
      )}
    </div>
  );
}
