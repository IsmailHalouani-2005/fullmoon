import Image from 'next/image';

interface LoadingScreenProps {
    roomCode: string;
}

export default function LoadingScreen({ roomCode }: LoadingScreenProps) {
    return (
        <div className="h-screen w-screen bg-primary flex flex-col items-center justify-center">
            <Image
                src="/assets/images/logo_fullmoon.png"
                alt="FullMoon"
                width={80}
                height={80}
                className="animate-pulse mb-4"
            />
            <p className="text-secondary font-enchanted text-5xl">
                Connexion au village...
            </p>
            <p className="text-dark/50 font-montserrat text-sm mt-3 tracking-widest uppercase">
                {roomCode}
            </p>
        </div>
    );
}
