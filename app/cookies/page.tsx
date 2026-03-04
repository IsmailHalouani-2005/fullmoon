import Header from '@/components/Header';
import Footer from '@/components/Footer';

export default function CookiesPage() {
    return (
        <div className="min-h-screen w-full bg-[#fdfaf6] text-slate-800 font-montserrat flex flex-col">
            <Header isDark={false} />

            <main className="flex-1 max-w-4xl mx-auto px-6 py-16 w-full mt-20">
                <h1 className="font-enchanted text-5xl md:text-6xl tracking-widest text-slate-900 mb-8 border-b-2 border-[#D1A07A] pb-4">
                    Politique de Cookies
                </h1>

                <div className="prose prose-slate max-w-none prose-headings:font-enchanted prose-headings:tracking-wider prose-a:text-[#D1A07A] hover:prose-a:text-[#a67c5d] prose-strong:text-slate-900">
                    <p className="text-xl font-bold mb-8">fullmoon.ismailhalouani.eu</p>

                    <p>
                        La présente politique de cookies a pour objectif d'informer les utilisateurs du site fullmoon.ismailhalouani.eu de l'utilisation des cookies techniques nécessaires. Un cookie est un petit fichier texte stocké sur votre appareil par votre navigateur lors de votre visite.
                    </p>

                    <h2 className="text-3xl mt-12 mb-6 text-[#D1A07A]">Qu'est-ce qu'un cookie ?</h2>
                    <p>Les cookies sont des traceurs utilisés pour mémoriser des informations sur votre navigation. Ils peuvent être classés en deux catégories :</p>
                    <ul className="list-disc pl-6 my-4 space-y-2">
                        <li><strong>Essentiels :</strong> Strictement nécessaires au bon fonctionnement et à la sécurité du site.</li>
                        <li><strong>Non Essentiels :</strong> Utilisés pour l'analyse, la publicité ou la personnalisation.</li>
                    </ul>

                    <h2 className="text-3xl mt-12 mb-6 text-[#D1A07A]">Cookies Utilisés (Cookies Stricte Nécessité)</h2>
                    <p>Le site fullmoon.ismailhalouani.eu utilise uniquement des cookies classés comme strictement nécessaires à son fonctionnement et à son affichage.</p>

                    <div className="overflow-x-auto my-8">
                        <table className="w-full text-left border-collapse bg-white shadow-sm rounded-lg overflow-hidden">
                            <thead className="bg-slate-100 border-b-2 border-slate-200">
                                <tr>
                                    <th className="p-4 font-bold text-slate-700">Catégorie de Cookie</th>
                                    <th className="p-4 font-bold text-slate-700">Exemple</th>
                                    <th className="p-4 font-bold text-slate-700">Utilité</th>
                                    <th className="p-4 font-bold text-slate-700">Consentement requis</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-200">
                                <tr className="hover:bg-slate-50">
                                    <td className="p-4">Cookies Techniques & Sécurité</td>
                                    <td className="p-4 font-mono text-sm">Firebase Auth (ex. tokens de session sécurisés)</td>
                                    <td className="p-4">Strictement nécessaires pour maintenir votre connexion au jeu de façon sécurisée (Firebase Authentication) et assurer le bon routage du serveur.</td>
                                    <td className="p-4 font-bold text-green-600">NON (Exempté de consentement).</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>

                    <p>
                        Le site fullmoon.ismailhalouani.eu ne dépose aucun cookie non essentiel pour la mesure d'audience (type Google Analytics), la publicité ou les réseaux sociaux.
                    </p>

                    <h2 className="text-3xl mt-12 mb-6 text-[#D1A07A]">Gestion des Cookies</h2>
                    <p>
                        Étant donné que le site utilise uniquement des cookies strictement nécessaires, aucune bannière de consentement n'est affichée.
                    </p>
                    <p>
                        Toutefois, vous avez le droit de gérer et de bloquer ces cookies directement via les paramètres de votre navigateur (Chrome, Firefox, Edge, etc.). Bloquer les cookies techniques pourrait entraîner une dégradation du fonctionnement du site.
                    </p>

                    <h2 className="text-3xl mt-12 mb-6 text-[#D1A07A]">Contact</h2>
                    <p>Pour toute question relative à cette politique de cookies et à la gestion de vos données personnelles, veuillez contacter :</p>
                    <ul className="bg-slate-100 p-6 rounded-lg my-6 space-y-2 border border-slate-200">
                        <li><strong>Éditeur du Site :</strong> Ismail Halouani</li>
                        <li><strong>Email :</strong> <a href="mailto:ismail.halouani@gmail.com">ismail.halouani@gmail.com</a></li>
                        <li><strong>Téléphone :</strong> (+33) 06 95 20 63 97</li>
                    </ul>

                </div>
            </main>
            <Footer />
        </div>
    );
}
