export type RoleId =
    | 'VILLAGEOIS' | 'VOYANTE' | 'SORCIERE' | 'CHASSEUR' | 'CUPIDON' | 'PETITE_FILLE'
    | 'LOUP_GAROU' | 'LOUP_ALPHA' | 'GRAND_MECHANT_LOUP' | 'LOUP_INFECT' | 'LOUP_BLANC'
    | 'ASSASSIN' | 'FOU' | 'PYROMANE' | 'EMPOISONNEUR';

export type Camp = 'VILLAGE' | 'LOUPS' | 'SOLO';

export type PowerId =
    | 'FUSIL' | 'POTION_SOIN' | 'POTION_POISON' | 'COUP_DE_COEUR' | 'VISION_LUNAIRE'
    | 'MORSURE_INFECTE' | 'DOUBLE_VOTE' | 'GRIFFURE_MORTELLE' | 'TRAHISON' | 'LAME_NOIRE'
    | 'ESSENCE' | 'ALLUMETTE' | 'POISON_TOXIQUE';

export interface Power {
    id: PowerId;
    label: string;
    icon: string;
    type: 'passive' | 'active' | 'one-time';
    timing: 'night' | 'day' | 'death' | 'always';
}

export interface RoleDefinition {
    id: RoleId;
    label: string;
    description: string;
    capacity: string;
    camp: Camp;
    image: string;
    powers?: Power[];
}

export const ROLES: Record<RoleId, RoleDefinition> = {
    VILLAGEOIS: {
        id: 'VILLAGEOIS',
        label: "Villageois",
        description: "L'âme du village. Sans pouvoir, mais armé de sa seule intuition pour démasquer le mal.",
        capacity: "Vote : Sa voix compte autant que celle d'un roi lors du conseil.",
        camp: 'VILLAGE',
        image: "/assets/images/roles/villagers/Villageois.png"
    },
    VOYANTE: {
        id: 'VOYANTE',
        label: "Voyante",
        description: "Gardienne des secrets, elle sonde les âmes dans le miroir de la vérité.",
        capacity: "Vision : Chaque nuit, elle découvre la véritable identité d'un joueur.",
        camp: 'VILLAGE',
        image: "/assets/images/roles/villagers/Voyante.png",
        powers: [
            { id: 'VISION_LUNAIRE', label: "Vision", icon: "/assets/images/icones/powers/super_oeil_magique.png", type: 'active', timing: 'night' }
        ]
    },
    SORCIERE: {
        id: 'SORCIERE',
        label: "Sorcière",
        description: "Maîtresse de la vie et de la mort, elle prépare ses potions dans l'ombre.",
        capacity: "Dualité : Possède une potion de vie (sauvetage) et une de mort (élimination).",
        camp: 'VILLAGE',
        image: "/assets/images/roles/villagers/Sorciere.png",
        powers: [
            { id: 'POTION_SOIN', label: "Soin", icon: "/assets/images/icones/powers/Potion_Soin.png", type: 'one-time', timing: 'night' },
            { id: 'POTION_POISON', label: "Poison", icon: "/assets/images/icones/powers/Potion_Poison.png", type: 'one-time', timing: 'night' }
        ]
    },
    CHASSEUR: {
        id: 'CHASSEUR',
        label: "Chasseur",
        description: "Vieux briscard à la gâchette facile. S'il tombe, il n'ira pas seul dans la tombe.",
        capacity: "Dernier Souffle : À sa mort, il désigne un joueur pour l'emporter avec lui.",
        camp: 'VILLAGE',
        image: "/assets/images/roles/villagers/Chasseur.png",
        powers: [
            { id: 'FUSIL', label: "Tir", icon: "/assets/images/icones/powers/fusil.png", type: 'active', timing: 'death' }
        ]
    },
    CUPIDON: {
        id: 'CUPIDON',
        label: "Cupidon",
        description: "L'archer des cœurs. Il lie deux destinées pour le meilleur... et surtout pour le pire.",
        capacity: "Lien Éternel : Désigne deux amoureux. Si l'un meurt, l'autre succombe de chagrin.",
        camp: 'VILLAGE',
        image: "/assets/images/roles/villagers/Cupidon.png",
        powers: [
            { id: 'COUP_DE_COEUR', label: "Mariage", icon: "/assets/images/roles/villagers/coup_coeur.png", type: 'one-time', timing: 'night' }
        ]
    },
    PETITE_FILLE: {
        id: 'PETITE_FILLE',
        label: "Petite Fille",
        description: "Curieuse et intrépide, elle entrouvre les yeux quand tout le monde doit dormir.",
        capacity: "Espionnage : Peut entrevoir les messages secrets des Loups.",
        camp: 'VILLAGE',
        image: "/assets/images/roles/villagers/Petite_fille.png"
    },
    LOUP_GAROU: {
        id: 'LOUP_GAROU',
        label: "Loup-Garou",
        description: "Prédateur nocturne. Sous la pleine lune, son humanité s'efface devant la faim.",
        capacity: "Meute : Vote chaque nuit pour dévorer un villageois avec ses semblables.",
        camp: 'LOUPS',
        image: "/assets/images/roles/werwolves/LoupGarou.png"
    },
    LOUP_ALPHA: {
        id: 'LOUP_ALPHA',
        label: "Loup-Alpha",
        description: "Le meneur de la meute. Son grognement impose le respect et double sa force.",
        capacity: "Dominance : Son vote compte double lors du conseil nocturne des Loups.",
        camp: 'LOUPS',
        image: "/assets/images/roles/werwolves/Loup_Alpha.png",
        powers: [
            { id: 'DOUBLE_VOTE', label: "Double Vote", icon: "", type: 'passive', timing: 'night' }
        ]
    },
    GRAND_MECHANT_LOUP: {
        id: 'GRAND_MECHANT_LOUP',
        label: "Grand Méchant Loup",
        description: "La bête ultime. Sa faim est telle qu'il peut frapper deux fois.",
        capacity: "Carnage : Tant qu'aucun autre loup n'est mort, il peut dévorer une seconde victime seule.",
        camp: 'LOUPS',
        image: "/assets/images/roles/werwolves/Grand_Mechant_Loup.png",
        powers: [
            { id: 'GRIFFURE_MORTELLE', label: "Carnage", icon: "/assets/images/icones/powers/griffure_mortel.png", type: 'active', timing: 'night' }
        ]
    },
    LOUP_INFECT: {
        id: 'LOUP_INFECT',
        label: "Loup Infect",
        description: "Porteur d'une malédiction ancienne, il transforme ses proies au lieu de les tuer.",
        capacity: "Infection : Une fois par partie, il transforme la victime des loups en Loup-Garou.",
        camp: 'LOUPS',
        image: "/assets/images/roles/werwolves/Loup_Infect.png",
        powers: [
            { id: 'MORSURE_INFECTE', label: "Infection", icon: "/assets/images/icones/powers/morsure_infecte.png", type: 'one-time', timing: 'night' }
        ]
    },
    LOUP_BLANC: {
        id: 'LOUP_BLANC',
        label: "Loup Blanc",
        description: "L'intrus parmi les monstres. Il ne sert qu'une seule cause : la sienne.",
        capacity: "Trahison : Une nuit sur deux, il peut dévorer un autre Loup-Garou.",
        camp: 'SOLO',
        image: "/assets/images/roles/werwolves/Loup_Blanc.png",
        powers: [
            { id: 'TRAHISON', label: "Trahison", icon: "", type: 'active', timing: 'night' }
        ]
    },
    ASSASSIN: {
        id: 'ASSASSIN',
        label: "Assassin",
        description: "L'ombre silencieuse qui frappe chirurgicalement.",
        capacity: "Lame Noire : Élimine une cible de son choix chaque nuit, traversant les protections.",
        camp: 'SOLO',
        image: "/assets/images/roles/solos/Assassin.png",
        powers: [
            { id: 'LAME_NOIRE', label: "Assassinat", icon: "/assets/images/icones/powers/lame_noire.png", type: 'active', timing: 'night' }
        ]
    },
    FOU: {
        id: 'FOU',
        label: "Fou",
        description: "Dans sa démence, il cherche le salut dans la corde du bourreau.",
        capacity: "Martyre : Gagne la partie s'il réussit à se faire éliminer par le vote du village.",
        camp: 'SOLO',
        image: "/assets/images/roles/solos/Fou.png"
    },
    PYROMANE: {
        id: 'PYROMANE',
        label: "Pyromane",
        description: "Il ne veut pas gagner, il veut voir le monde brûler.",
        capacity: "Brasier : Arrose les maisons d'essence la nuit et choisit quand déclencher l'incendie général.",
        camp: 'SOLO',
        image: "/assets/images/roles/solos/Pyromane.png",
        powers: [
            { id: 'ESSENCE', label: "Arrosage", icon: "/assets/images/icones/powers/essance_bidon.png", type: 'active', timing: 'night' },
            { id: 'ALLUMETTE', label: "Incendie", icon: "/assets/images/icones/powers/allumette.png", type: 'active', timing: 'night' }
        ]
    },
    EMPOISONNEUR: {
        id: 'EMPOISONNEUR',
        label: "Empoisonneur",
        description: "Il distille le silence dans des fioles de verre.",
        capacity: "L'Aphonie : Chaque nuit, il choisit une victime. Le poison prive la cible de son vote et de ses capacités.",
        camp: 'SOLO',
        image: "/assets/images/roles/solos/Empoisonneur.png",
        powers: [
            { id: 'POISON_TOXIQUE', label: "Toxique", icon: "/assets/images/icones/powers/poison_toxique.png", type: 'active', timing: 'night' }
        ]
    }
};

export const isInWolfCamp = (roleId: RoleId | null | undefined): boolean => {
    if (!roleId) return false;
    return ROLES[roleId]?.camp === 'LOUPS';
};
