import Link from 'next/link';
import Image from 'next/image';

export default function NotFound() {
    return (
        <div className="min-h-screen bg-[#1a1b26] flex flex-col items-center justify-center p-8 text-center font-montserrat">
            <div className="relative w-32 h-32 mb-6 opacity-60">
                <Image
                    src="/assets/images/icones/Moon.png"
                    alt="Lune"
                    fill
                    className="object-contain animate-pulse"
                />
            </div>

            <h1 className="font-enchanted text-8xl text-[#D1A07A] mb-2 tracking-wider drop-shadow-lg">
                404
            </h1>

            <h2 className="font-enchanted text-3xl text-white mb-4 tracking-wide">
                Le village est introuvable
            </h2>

            <p className="text-slate-400 text-sm mb-10 max-w-sm leading-relaxed">
                Cette page n{"'"}existe pas ou a été emportée par les loups pendant la nuit.
            </p>

            <Link
                href="/"
                className="bg-[#D1A07A] text-dark font-extrabold px-8 py-3 rounded-xl hover:bg-[#b08465] transition-colors shadow-lg text-base"
            >
                Retourner au village
            </Link>
        </div>
    );
}
