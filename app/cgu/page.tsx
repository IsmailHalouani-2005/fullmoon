import Header from '@/components/Header';
import Link from 'next/link';
import Footer from '@/components/Footer';

export default function CGUPage() {
    return (
        <div className="min-h-screen w-full bg-[#fdfaf6] text-slate-800 font-montserrat flex flex-col">
            <Header isDark={false} />

            <main className="flex-1 max-w-4xl mx-auto px-6 py-16 w-full mt-20">
                <h1 className="font-enchanted text-5xl md:text-6xl tracking-widest text-slate-900 mb-8 border-b-2 border-[#D1A07A] pb-4">
                    Conditions générales d'utilisation
                </h1>

                <div className="prose prose-slate max-w-none prose-headings:font-enchanted prose-headings:tracking-wider prose-a:text-[#D1A07A] hover:prose-a:text-[#a67c5d] prose-strong:text-slate-900">
                    <p className="text-sm text-slate-500 italic mb-8">En vigueur au 02/03/2026</p>

                    <p>
                        Les présentes conditions générales d'utilisation (dites « CGU ») ont pour objet l'encadrement juridique des modalités de mise à disposition du site et des services par Ismail Halouani et de définir les conditions d'accès et d'utilisation des services par « l'Utilisateur ».
                    </p>
                    <p>
                        Les présentes CGU sont accessibles sur le site à la rubrique «CGU».
                    </p>

                    <h2 className="text-3xl mt-12 mb-6 text-[#D1A07A]">Article 1 : Les mentions légales</h2>
                    <p>L'édition et la direction de la publication du site fullmoon.ismailhalouani.eu est assurée par Halouani Ismail.</p>
                    <p>Numéro de téléphone est +33695206397</p>
                    <p>Adresse e-mail ismail.halouani@gmail.com .</p>
                    <p>
                        L'hébergeur du site fullmoon.ismailhalouani.eu est la société Infomaniak, dont le siège social est situé au Rue Eugène-Marziano 25, 1227 Genève, avec le numéro de téléphone : +41 22 820 35 40 .
                    </p>

                    <h2 className="text-3xl mt-12 mb-6 text-[#D1A07A]">Article 2 : Accès au site</h2>
                    <p>Le site fullmoon.ismailhalouani.eu permet à l'Utilisateur un accès gratuit aux services suivants :</p>
                    <p>Le site internet propose les services suivants :</p>
                    <div className="bg-slate-100 p-6 rounded-lg my-6 border-l-4 border-[#D1A07A]">
                        Le site a pour vocation principale de proposer à ses Utilisateurs une expérience ludique, inédite et immersive du célèbre jeu de société "Les Loups-Garous de Thiercelieux", adaptée entièrement pour le jeu en ligne.
                        À travers une interface interactive et des fonctionnalités temps réel (tchat vocal intégré, système de rôles dynamiques, gestion de la temporalité jour/nuit), les Utilisateurs peuvent rejoindre des salons virtuels, incarner des identités cachées et interagir avec d'autres joueurs pour remporter la partie.
                        En marge de cette expérience de jeu, le site sert également de vitrine interactive démontrant les compétences techniques de son développeur (Fullstack, intégration temps réel, conception UI/UX). Les visiteurs professionnels peuvent y trouver des liens de contact directs vers le développeur.
                    </div>
                    <p>
                        Le site est accessible gratuitement en tout lieu à tout Utilisateur ayant un accès à Internet. Tous les frais supportés par l'Utilisateur pour accéder au service (matériel informatique, logiciels, connexion Internet, etc.) sont à sa charge.
                    </p>

                    <h2 className="text-3xl mt-12 mb-6 text-[#D1A07A]">Article 3 : Collecte des données</h2>
                    <p>
                        Le site assure à l'Utilisateur une collecte et un traitement d'informations personnelles dans le respect de la vie privée conformément à la loi n°78-17 du 6 janvier 1978 relative à l'informatique, aux fichiers et aux libertés.
                    </p>
                    <p>
                        En vertu de la loi Informatique et Libertés, en date du 6 janvier 1978, l'Utilisateur dispose d'un droit d'accès, de rectification, de suppression et d'opposition de ses données personnelles. L'Utilisateur exerce ce droit :
                    </p>
                    <ul className="list-disc pl-6 my-4 space-y-2">
                        <li>par mail à l'adresse email ismail.halouani@gmail.com</li>
                        <li>via un formulaire de contact ;</li>
                    </ul>

                    <h2 className="text-3xl mt-12 mb-6 text-[#D1A07A]">Article 4 : Propriété intellectuelle</h2>
                    <p>
                        Les marques, logos, signes ainsi que tous les contenus du site (textes, images, son…) font l'objet d'une protection par le Code de la propriété intellectuelle et plus particulièrement par le droit d'auteur.
                    </p>
                    <p>
                        L'Utilisateur doit solliciter l'autorisation préalable du site pour toute reproduction, publication, copie des différents contenus. Il s'engage à une utilisation des contenus du site dans un cadre strictement privé, toute utilisation à des fins commerciales et publicitaires est strictement interdite.
                    </p>
                    <p>
                        Toute représentation totale ou partielle de ce site par quelque procédé que ce soit, sans l'autorisation expresse de l'exploitant du site Internet constituerait une contrefaçon sanctionnée par l'article L 335-2 et suivants du Code de la propriété intellectuelle.
                    </p>
                    <p>
                        Il est rappelé conformément à l'article L122-5 du Code de propriété intellectuelle que l'Utilisateur qui reproduit, copie ou publie le contenu protégé doit citer l'auteur et sa source.
                    </p>

                    <h2 className="text-3xl mt-12 mb-6 text-[#D1A07A]">Article 5 : Responsabilité</h2>
                    <p>
                        Les sources des informations diffusées sur le site fullmoon.ismailhalouani.eu sont réputées fiables mais le site ne garantit pas qu'il soit exempt de défauts, d'erreurs ou d'omissions.
                    </p>
                    <p>
                        Les informations communiquées sont présentées à titre indicatif et général sans valeur contractuelle. Malgré des mises à jour régulières, le site fullmoon.ismailhalouani.eu ne peut être tenu responsable de la modification des dispositions administratives et juridiques survenant après la publication. De même, le site ne peut être tenue responsable de l'utilisation et de l'interprétation de l'information contenue dans ce site.
                    </p>
                    <p>
                        Le site fullmoon.ismailhalouani.eu ne peut être tenu pour responsable d'éventuels virus qui pourraient infecter l'ordinateur ou tout matériel informatique de l'Internaute, suite à une utilisation, à l'accès, ou au téléchargement provenant de ce site.
                    </p>
                    <p>
                        La responsabilité du site ne peut être engagée en cas de force majeure ou du fait imprévisible et insurmontable d'un tiers.
                    </p>

                    <h2 className="text-3xl mt-12 mb-6 text-[#D1A07A]">Article 6 : Liens hypertextes</h2>
                    <p>
                        Des liens hypertextes peuvent être présents sur le site. L'Utilisateur est informé qu'en cliquant sur ces liens, il sortira du site fullmoon.ismailhalouani.eu. Ce dernier n'a pas de contrôle sur les pages web sur lesquelles aboutissent ces liens et ne saurait, en aucun cas, être responsable de leur contenu.
                    </p>

                    <h2 className="text-3xl mt-12 mb-6 text-[#D1A07A]">Article 7 : Cookies</h2>
                    <p>
                        L'Utilisateur est informé que lors de ses visites sur le site, un cookie peut s'installer automatiquement sur son logiciel de navigation.
                    </p>
                    <p>
                        Les cookies sont de petits fichiers stockés temporairement sur le disque dur de l'ordinateur de l'Utilisateur par votre navigateur et qui sont nécessaires à l'utilisation du site fullmoon.ismailhalouani.eu. Les cookies ne contiennent pas d'information personnelle et ne peuvent pas être utilisés pour identifier quelqu'un. Un cookie contient un identifiant unique, généré aléatoirement et donc anonyme. Certains cookies expirent à la fin de la visite de l'Utilisateur, d'autres restent.
                    </p>
                    <p>
                        L'information contenue dans les cookies est utilisée pour améliorer le site fullmoon.ismailhalouani.eu.
                    </p>
                    <p>
                        En naviguant sur le site, L'Utilisateur les accepte.
                    </p>
                    <p>
                        L'Utilisateur doit toutefois donner son consentement quant à l'utilisation de certains cookies. A défaut d'acceptation, l'Utilisateur est informé que certaines fonctionnalités ou pages risquent de lui être refusées.
                    </p>
                    <p>
                        L'Utilisateur pourra désactiver ces cookies par l'intermédiaire des paramètres figurant au sein de son logiciel de navigation.
                    </p>
                    <p>
                        Pour plus d'informations en matière de cookies, se reporter à la Charte en matière de cookies du site fullmoon.ismailhalouani.eu accessible à la rubrique <Link href="/cookies" className="font-bold underline">Cookies</Link>.
                    </p>

                    <h2 className="text-3xl mt-12 mb-6 text-[#D1A07A]">Article 8 : Droit applicable et juridiction compétente</h2>
                    <p>
                        La législation française s'applique au présent contrat. En cas d'absence de résolution amiable d'un litige né entre les parties, les tribunaux français seront seuls compétents pour en connaître.
                    </p>
                    <p>
                        Pour toute question relative à l'application des présentes CGU, vous pouvez joindre l'éditeur aux coordonnées inscrites à l'Article 1.
                    </p>

                </div>
            </main>
            <Footer />
        </div>
    );
}
