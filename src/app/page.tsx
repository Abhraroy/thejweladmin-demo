import Image from "next/image";
import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen w-full flex items-center justify-center bg-white">
      <div className="flex flex-col items-center justify-center gap-10 px-6">
        <div className="landing-fade-up landing-delay-0 flex flex-col items-center gap-5">
          <Image
            src="/logo/cropped-logo.svg"
            alt="JWEL"
            width={160}
            height={172}
            priority
            className="h-auto w-36 sm:w-40 select-none"
            draggable={false}
          />
          <h1 className="text-5xl sm:text-6xl font-light tracking-[0.35em] text-neutral-900 uppercase pl-[0.35em]">
            THE JWEL
          </h1>
        </div>

        <div className="landing-fade-up landing-delay-1">
          <Link
            href="/login"
            className="inline-flex items-center justify-center rounded-full border border-neutral-900 bg-neutral-900 px-10 py-3 text-sm font-medium tracking-[0.2em] uppercase text-white transition-all duration-300 hover:bg-white hover:text-neutral-900 active:scale-[0.98]"
          >
            Enter Admin
          </Link>
        </div>
      </div>
    </main>
  );
}
