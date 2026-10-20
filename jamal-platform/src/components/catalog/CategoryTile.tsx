import Link from "next/link";
import Image from "next/image";
import { artFor } from "@/lib/art";

export function CategoryTile({ slug, name, count, image }: { slug: string; name: string; count?: number; image?: string | null }) {
  return (
    <Link href={`/category/${slug}`} className="group relative block overflow-hidden rounded-[var(--radius-card)] bg-sand">
      <div className="relative aspect-[4/5]">
        {image ? (
          <Image src={image} alt="" fill sizes="(min-width:768px) 33vw, 50vw" className="object-cover transition-transform duration-700 group-hover:scale-[1.04]" />
        ) : (
          <svg viewBox="0 0 200 260" className="absolute inset-0 m-auto h-[70%] w-[70%] text-beige-deep/70 transition-transform duration-700 group-hover:scale-[1.05]" aria-hidden>
            <path d={artFor(slug)} fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </div>
      <div className="absolute inset-x-0 bottom-0 flex items-end justify-between bg-gradient-to-t from-ink/55 to-transparent p-4 pt-12 text-ivory">
        <span className="text-base font-bold md:text-lg">{name}</span>
        {count !== undefined && count > 0 && <span className="text-xs text-ivory/80">{count} منتج</span>}
      </div>
    </Link>
  );
}

/** Round category shortcut for phones (horizontal row). */
export function CategoryCircle({ slug, name, image }: { slug: string; name: string; image?: string | null }) {
  return (
    <Link href={`/category/${slug}`} className="group flex w-20 flex-col items-center gap-2 text-center">
      <span className="relative block size-20 overflow-hidden rounded-full bg-sand ring-1 ring-line transition-shadow group-hover:ring-2 group-hover:ring-ink">
        {image ? (
          <Image src={image} alt="" fill sizes="80px" className="object-cover" />
        ) : (
          <svg viewBox="0 0 200 260" className="absolute inset-0 m-auto h-[72%] w-[72%] text-beige-deep" aria-hidden>
            <path d={artFor(slug)} fill="none" stroke="currentColor" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </span>
      <span className="line-clamp-2 text-xs font-semibold leading-5 text-ink-soft">{name}</span>
    </Link>
  );
}
