import Header from '@/components/Header';
import Link from 'next/link';
import Footer from '@/components/Footer';

export default function LegalPage() {
    return (
        <div className="min-h-screen w-full bg-[#fdfaf6] text-slate-800 font-montserrat flex flex-col">
            <Header isDark={false} />

            <main className="flex-1 max-w-4xl mx-auto px-6 py-16 w-full mt-20">
                <h1 className="font-enchanted text-5xl md:text-6xl tracking-widest text-slate-900 mb-8 border-b-2 border-[#D1A07A] pb-4">
                    Mentions légales
                </h1>

                <div className="prose prose-slate max-w-none prose-headings:font-enchanted prose-headings:tracking-wider prose-a:text-[#D1A07A] hover:prose-a:text-[#a67c5d] prose-strong:text-slate-900">
                    <p className="text-sm text-slate-500 italic mb-8">En vigueur au 02/03/2026</p>

                    <p>
                        Conformément aux dispositions de la loi n°2004-575 du 21 juin 2004 pour la Confiance en l'économie numérique, il est porté à la connaissance des utilisateurs et visiteurs, ci-après l' "Utilisateur", du site <strong>fullmoon.ismailhalouani.eu</strong>, ci-après le "Site", les présentes mentions légales.
                    </p>
                    <p>
                        La connexion et la navigation sur le Site par l'Utilisateur implique acceptation intégrale et sans réserve des présentes mentions légales.
                    </p>
                    <p>
                        Ces dernières sont accessibles sur le Site à la rubrique "Mentions légales".
                    </p>

                    <h2 className="text-3xl mt-12 mb-6">ÉDITION DU SITE</h2>
                    <p>
                        L'édition et la direction de la publication du Site est assurée par Ismail Halouani, dont le numéro de téléphone est +33695206397, et l'adresse e-mail ismail.halouani@gmail.com .
                    </p>
                    <p>ci-après l'"Editeur".</p>

                    <h2 className="text-3xl mt-12 mb-6">HÉBERGEUR</h2>
                    <p>
                        L'hébergeur du Site est la société Infomaniak, dont le siège social est situé au Rue Eugène-Marziano 25, 1227 Genève, dont le numéro de téléphone est +41 22 820 35 40 .
                    </p>

                    <h2 className="text-3xl mt-12 mb-6">ACCÈS AU SITE</h2>
                    <p>
                        Le Site est normalement accessible, à tout moment, à l'Utilisateur. Toutefois, l'Editeur pourra, à tout moment, suspendre, limiter ou interrompre le Site afin de procéder, notamment, à des mises à jour ou des modifications de son contenu. L'Editeur ne pourra en aucun cas être tenu responsable des conséquences éventuelles de cette indisponibilité sur les activités de l'Utilisateur.
                    </p>

                    <h2 className="text-3xl mt-12 mb-6">COLLECTE DES DONNÉES</h2>
                    <p>
                        Le Site assure à l'Utilisateur une collecte et un traitement des données personnelles dans le respect de la vie privée conformément à la loi n°78-17 du 6 janvier 1978 relative à l'informatique, aux fichiers aux libertés et dans le respect de la règlementation applicable en matière de traitement des données à caractère personnel conformément au règlement (UE) 2016/679 du Parlement européen et du Conseil du 27 avril 2016 (ci-après, ensemble, la "Règlementation applicable en matière de protection des Données à caractère personnel").
                    </p>
                    <p>
                        En vertu de la Règlementation applicable en matière de protection des Données à caractère personnel, l'Utilisateur dispose d'un droit d'accès, de rectification, de suppression et d'opposition de ses données personnelles. L'Utilisateur peut exercer ce droit :
                    </p>
                    <ul className="list-disc pl-6 my-4 space-y-2">
                        <li>par mail à l'adresse email ismail.halouani@gmail.com</li>
                        <li>depuis le formulaire de contact ;</li>
                    </ul>

                    <h2 className="text-3xl mt-12 mb-6">PROPRIÉTÉ INTELLECTUELLE</h2>
                    <p>
                        Toute utilisation, reproduction, diffusion, commercialisation, modification de toute ou partie du Site, sans autorisation expresse de l'Editeur est prohibée et pourra entraîner des actions et poursuites judiciaires telles que prévues par la règlementation en vigueur.
                    </p>

                    <div className="bg-slate-100 p-6 rounded-lg mt-12 border border-slate-200">
                        <ul className="space-y-4">
                            <li>Pour plus d'informations, se reporter aux CGU du site fullmoon.ismailhalouani.eu accessibles depuis la rubrique <Link href="/cgu" className="font-bold underline">CGU</Link>.</li>
                            <li>Pour plus d'informations en matière de protection des données à caractère personnel, se reporter à la Charte en matière de protection des données à caractère personnel du site fullmoon.ismailhalouani.eu accessible depuis la rubrique <Link href="/privacy" className="font-bold underline">Données personnelles</Link>.</li>
                            <li>Pour plus d'informations en matière de cookies, se reporter à la Charte en matière de cookies du site fullmoon.ismailhalouani.eu accessible à la rubrique <Link href="/cookies" className="font-bold underline">Cookies</Link>.</li>
                        </ul>
                    </div>
                </div>
            </main>
            <Footer />
        </div>
    );
}
