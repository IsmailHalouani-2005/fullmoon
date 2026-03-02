import Image from 'next/image';
import { ROLES, RoleId } from "@/types/roles";

interface RoleCardProps {
    roleId?: RoleId;
    isCardFlipped: boolean;
    onFlip: () => void;
    showCapacity?: boolean;
    isMayor?: boolean;
    className?: string; // allow overriding classes for the container
    frontImageSrc?: string;
}

export default function RoleCard({
    roleId,
    isCardFlipped,
    onFlip,
    showCapacity = false,
    isMayor = false,
    className = "w-[180px] sm:w-[240px]",
    frontImageSrc = "/assets/images/icones/Carte_Role.png"
}: RoleCardProps) {

    const roleDef = roleId ? ROLES[roleId] : null;

    return (
        <div
            className={`relative aspect-[848/1264] cursor-pointer transition-transform duration-700 transform-style-3d ${isCardFlipped ? 'rotate-y-180' : ''} ${className}`}
            onClick={onFlip}
        >
            {/* Front (Hidden state) */}
            <div className="max-w-[484px] max-h-[864px] absolute inset-0 backface-hidden rounded-xl shadow-2xl overflow-hidden bg-transparent flex items-center justify-center">
                <Image src={frontImageSrc} alt="Dos de carte" fill className="object-cover max-w-[484px] max-h-[864px]" />
            </div>

            {/* Back (Revealed state) */}
            <div className="max-w-[484px] max-h-[864px] absolute inset-0 backface-hidden rotate-y-180 rounded-xl shadow-2xl overflow-hidden bg-primary flex flex-col items-center justify-center p-6 sm:p-8 text-dark text-center">
                {roleDef ? (
                    <>
                        {/* Role Image */}
                        <div className="relative w-16 h-16 sm:w-20 sm:h-20 drop-shadow-2xl mb-4">
                            <Image src={roleDef.image || frontImageSrc} alt={roleDef.label || "Rôle"} fill className="object-contain" />
                        </div>

                        {/* Role Name */}
                        <h3 className="text-md sm:text-lg font-extrabold tracking-wide mb-3">{roleDef.label}</h3>

                        {/* Camp Badge */}
                        <div className={`px-4 py-1.5 rounded-full mb-4 sm:mb-6 ${roleDef.camp === 'LOUPS' ? 'bg-[#e53e3e]' : (roleDef.camp === 'VILLAGE' ? 'bg-green-500' : 'bg-purple-500')}`}>
                            <span className="text-[10px] sm:text-xs font-bold text-white uppercase tracking-widest">Camp : {roleDef.camp}</span>
                        </div>

                        {/* Description */}
                        <p className="text-[10px] sm:text-xs italic text-dark font-light leading-relaxed px-2 sm:px-4">"{roleDef.description}"</p>

                        {/* Capacity (optional for testing/admin area) */}
                        {showCapacity && roleDef.capacity && (
                            <div className="mt-4 pt-4 border-t border-dark/20 w-full px-2">
                                <p className="text-[10px] sm:text-xs font-bold uppercase tracking-widest text-slate-800 opacity-70">Capacité</p>
                                <p className="text-[10px] sm:text-xs font-medium text-slate-800">{roleDef.capacity}</p>
                            </div>
                        )}

                        {/* Indication supplémentaire Maire */}
                        {isMayor && (
                            <div className="absolute top-4 right-4 flex items-center justify-center gap-1 bg-[#D1A07A]/20 px-2 py-1 rounded-md border border-[#D1A07A]">
                                <Image src="/assets/images/icones/couronne-icon.png" alt="Maire" width={14} height={14} />
                                <span className="text-[8px] font-bold text-[#D1A07A] uppercase tracking-wider">Maire</span>
                            </div>
                        )}
                    </>
                ) : (
                    <div className="flex flex-col items-center justify-center h-full">
                        <span className="text-slate-500 italic">Rôle Inconnu</span>
                    </div>
                )}
            </div>
        </div>
    );
}
