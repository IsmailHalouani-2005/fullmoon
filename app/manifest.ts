import { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
    return {
        name: 'FullMoon — Loup-Garou en ligne',
        short_name: 'FullMoon',
        description: 'Jouez aux Loups-Garous en ligne avec vos amis. Chat vocal, rôles secrets, votes — sans maître du jeu.',
        start_url: '/',
        display: 'standalone',
        orientation: 'portrait',
        background_color: '#FCF8E8',
        theme_color: '#D1A07A',
        categories: ['games', 'entertainment'],
        icons: [
            {
                src: '/assets/images/logo_fullmoon.png',
                sizes: '192x192',
                type: 'image/png',
                purpose: 'any',
            },
            {
                src: '/assets/images/logo_fullmoon.png',
                sizes: '512x512',
                type: 'image/png',
                purpose: 'maskable',
            },
        ],
        screenshots: [
            {
                src: '/assets/images/thumbnail-fullmoon.jpg',
                sizes: '1200x630',
                type: 'image/jpg',
            },
        ],
    };
}
