import Header from '@/components/Header';
import Footer from '@/components/Footer';

export default function PrivacyPage() {
    return (
        <div className="min-h-screen w-full bg-[#fdfaf6] text-slate-800 font-montserrat flex flex-col">
            <Header isDark={false} />

            <main className="flex-1 max-w-4xl mx-auto px-6 py-16 w-full mt-20">
                <h1 className="font-enchanted text-5xl md:text-6xl tracking-widest text-slate-900 mb-8 border-b-2 border-[#D1A07A] pb-4">
                    Politique de confidentialité
                </h1>

                <div className="prose prose-slate max-w-none prose-headings:font-enchanted prose-headings:tracking-wider prose-a:text-[#D1A07A] hover:prose-a:text-[#a67c5d] prose-strong:text-slate-900">
                    <p className="text-xl font-bold mb-8">fullmoon.ismailhalouani.eu</p>

                    <h2 className="text-3xl mt-12 mb-6 text-[#D1A07A]">Article 1 : Préambule</h2>
                    <p>La présente politique de confidentialité a pour but d'informer les utilisateurs du site :</p>
                    <ul className="list-disc pl-6 my-4 space-y-2">
                        <li>Sur la manière dont sont collectées leurs données personnelles. Sont considérées comme des données personnelles, toute information permettant d'identifier un utilisateur. À ce titre, il peut s'agir : de ses noms et prénoms, de son âge, de son adresse postale ou e-mail, de sa localisation ou encore de son adresse IP (liste non-exhaustive) ;</li>
                        <li>Sur les droits dont ils disposent concernant ces données ;</li>
                        <li>Sur la personne responsable du traitement des données à caractère personnel collectées et traitées ;</li>
                        <li>Sur les destinataires de ces données personnelles ;</li>
                        <li>Sur la politique du site en matière de cookies.</li>
                    </ul>
                    <p>
                        Cette politique complète les mentions légales et les Conditions Générales d'Utilisation consultables par les utilisateurs à l'adresse suivante : https://fullmoon.ismailhalouani.eu/legal .
                    </p>

                    <h2 className="text-3xl mt-12 mb-6 text-[#D1A07A]">Article 2 : Principes relatifs à la collecte et au traitement des données personnelles</h2>
                    <p>Conformément à l'article 5 du Règlement européen 2016/679, les données à caractère personnel sont :</p>
                    <ul className="list-disc pl-6 my-4 space-y-2">
                        <li>Traitées de manière licite, loyale et transparente au regard de la personne concernée ;</li>
                        <li>Collectées pour des finalités déterminées (cf. Article 3.1 des présentes), explicites et légitimes, et ne pas être traitées ultérieurement d'une manière incompatible avec ces finalités ;</li>
                        <li>Adéquates, pertinentes et limitées à ce qui est nécessaire au regard des finalités pour lesquelles elles sont traitées ;</li>
                        <li>Exactes et, si nécessaire, tenues à jour. Toutes les mesures raisonnables doivent être prises pour que les données à caractère personnel qui sont inexactes, eu égard aux finalités pour lesquelles elles sont traitées, soient effacées ou rectifiées sans tarder ;</li>
                        <li>Conservées sous une forme permettant l'identification des personnes concernées pendant une durée n'excédant pas celle nécessaire au regard des finalités pour lesquelles elles sont traitées ;</li>
                        <li>Traitées de façon à garantir une sécurité appropriée des données collectées, y compris la protection contre le traitement non autorisé ou illicite et contre la perte, la destruction ou les dégâts d'origine accidentelle, à l'aide de mesures techniques ou organisationnelles appropriées.</li>
                    </ul>
                    <p>
                        Le traitement n'est licite que si, et dans la mesure où, au moins une des conditions suivantes est remplie : la personne concernée a consenti au traitement de ses données à caractère personnel pour une ou plusieurs finalités spécifiques ; le traitement est nécessaire à l'exécution d'un contrat auquel la personne concernée est partie ou à l'exécution de mesures précontractuelles prises à la demande de celle-ci ; le traitement est nécessaire au respect d'une obligation légale à laquelle le responsable du traitement est soumis.
                    </p>

                    <h2 className="text-3xl mt-12 mb-6 text-[#D1A07A]">Article 3 : Données à caractère personnel collectées et traitées</h2>

                    <h3 className="text-2xl mt-8 mb-4">Article 3.1 : Données collectées et Finalités</h3>
                    <p>Les données personnelles collectées dans le cadre de notre activité sont les suivantes :</p>
                    <ul className="list-disc pl-6 my-4 space-y-2">
                        <li><strong>Données de création de compte :</strong> Adresse e-mail, Pseudo, Mot de passe (crypté via Firebase Auth), et Photo de profil (optionnelle).</li>
                        <li><strong>Finalité :</strong> Création, sécurisation et gestion du compte Utilisateur pour accéder au jeu en ligne.</li>
                        <li><strong>Données de jeu et statistiques :</strong> Historique des parties (victoires, défaites), temps de jeu, points de classement, liste d'amis et événements in-game.</li>
                        <li><strong>Finalité :</strong> Assurer le bon fonctionnement des parties de "Loups-Garous", calculer les classements (Leaderboard) et personnaliser le profil public de l'Utilisateur.</li>
                        <li><strong>Données d'identification professionnelles (le cas échéant) :</strong> Nom, Prénom, Adresse e-mail, et Contenu d'un message adressé au développeur.</li>
                        <li><strong>Finalité :</strong> Répondre aux sollicitations (opportunités professionnelles).</li>
                        <li><strong>Données techniques, de communication et de connexion :</strong> Adresse IP, métadonnées du navigateur, et flux vocaux éphémères (WebRTC).</li>
                        <li><strong>Finalité :</strong> Assurer le fonctionnement du tchat vocal temps réel entre joueurs (peer-to-peer / serveurs de signalisation), garantir la sécurité, et mesurer l'audience technique.</li>
                    </ul>

                    <h3 className="text-2xl mt-8 mb-4">Article 3.2 : Mode de collecte et Durée de conservation</h3>
                    <p>
                        <strong>Mode de collecte :</strong> Les données de base sont collectées lors de l'inscription et la connexion. Les statistiques s'enrichissent au fil des parties jouées. Les flux vocaux transitent uniquement le temps de la partie et ne sont pas enregistrés. Les données techniques sont collectées automatiquement.
                    </p>
                    <p><strong>Durée de conservation :</strong></p>
                    <ul className="list-disc pl-6 my-4 space-y-2">
                        <li>Les données liées au compte (profil, statistiques, liste d'amis) sont conservées tant que le compte est actif. Elles sont <strong>immédiatement et définitivement effacées</strong> de la base de données lorsque l'Utilisateur déclenche la suppression de son compte.</li>
                        <li>Les données issues de prises de contact professionnelles sont conservées pour une durée n'excédant pas 3 ans après le dernier contact initié par l'Utilisateur.</li>
                        <li>Les données techniques de connexion sont conservées pour une durée n'excédant pas 25 mois.</li>
                    </ul>

                    <h3 className="text-2xl mt-8 mb-4">Article 3.3 : Hébergement des données</h3>
                    <p>Le site fullmoon.ismailhalouani.eu est hébergé par :</p>
                    <ul className="list-disc pl-6 my-4 space-y-2">
                        <li>Dénomination sociale : Infomaniak Network SA</li>
                        <li>Adresse du siège social : Rue Eugène-Marziano 25, 1227 Genève, Suisse</li>
                        <li>Contact : Formulaire de contact disponible sur le site Infomaniak.</li>
                    </ul>

                    <h3 className="text-2xl mt-8 mb-4">Article 3.4 : Politique en matière de "cookies"</h3>
                    <p>
                        Le Site utilise uniquement des cookies strictement nécessaires à son fonctionnement technique et à sa sécurité (cookies de cache, de session). Ces cookies sont exemptés de consentement en vertu de la réglementation RGPD et ne requièrent pas de bannière d'acceptation. Le Site n'utilise aucun cookie à des fins de publicité ou de traçage commercial.
                    </p>
                    <p>
                        Pour plus d'informations en matière de cookies, se reporter à la Charte en matière de cookies du site fullmoon.ismailhalouani.eu accessible à la rubrique " Cookies ".
                    </p>

                    <h2 className="text-3xl mt-12 mb-6 text-[#D1A07A]">Article 4 : Responsable du traitement des données</h2>

                    <h3 className="text-2xl mt-8 mb-4">Article 4.1 : Le responsable du traitement des données</h3>
                    <p>Les données à caractère personnel sont collectées par Ismail Halouani (Particulier / Éditeur individuel).</p>
                    <p>Le responsable du traitement des données à caractère personnel peut être contacté de la manière suivante :</p>
                    <ul className="list-disc pl-6 my-4 space-y-2">
                        <li>Par téléphone, au (+33) 06 95 20 63 97 ;</li>
                        <li>Par mail : ismail.halouani@gmail.com .</li>
                    </ul>

                    <h3 className="text-2xl mt-8 mb-4">Article 4.2 : Le délégué à la protection des données</h3>
                    <p>
                        En tant qu'éditeur individuel, Monsieur Ismail Halouani assure lui-même les fonctions du Délégué à la Protection des Données (DPO).
                    </p>
                    <p>
                        Si vous estimez, après nous avoir contactés, que vos droits "Informatique et Libertés", ne sont pas respectés, vous pouvez adresser une information à la CNIL.
                    </p>

                    <h2 className="text-3xl mt-12 mb-6 text-[#D1A07A]">Article 5 : Les droits de l'utilisateur</h2>
                    <p>
                        Tout utilisateur concerné par le traitement de ses données personnelles peut se prévaloir des droits suivants, en application du règlement européen 2016/679 et de la Loi Informatique et Liberté (Loi 78-17 du 6 janvier 1978) :
                    </p>
                    <ul className="list-disc pl-6 my-4 space-y-2">
                        <li><strong>Droit d'accès :</strong> L'utilisateur peut exercer son droit d'accès, pour connaître les données personnelles le concernant.</li>
                        <li><strong>Droit de rectification :</strong> Si les données à caractère personnel détenues par le responsable du traitement sont inexactes, l'utilisateur peut demander la mise à jour des informations.</li>
                        <li><strong>Droit à l'effacement des données :</strong> L'utilisateur peut demander la suppression de ses données à caractère personnel.</li>
                        <li><strong>Droit à la limitation du traitement :</strong> L'utilisateur peut demander la limitation du traitement de ses données personnelles.</li>
                        <li><strong>Droit d'opposition au traitement des données :</strong> L'utilisateur peut s'opposer au traitement de ses données par le site.</li>
                        <li><strong>Droit à la portabilité des données :</strong> L'utilisateur peut réclamer que le site lui remette les données personnelles qu'il lui a fournies pour les transmettre à un nouveau site.</li>
                    </ul>
                    <p>
                        Pour exercer vos droits, veuillez adresser à Ismail Halouani par mail à l'adresse : ismail.halouani@gmail.com .
                    </p>

                    <h2 className="text-3xl mt-12 mb-6 text-[#D1A07A]">Article 6 : Conditions de modification de la politique de confidentialité</h2>
                    <p>
                        L'éditeur du site fullmoon.ismailhalouani.eu se réserve le droit de pouvoir modifier la présente Politique à tout moment afin d'assurer aux utilisateurs du site sa conformité avec le droit en vigueur.
                    </p>
                    <p>
                        L'utilisateur est invité à prendre connaissance de cette Politique à chaque fois qu'il utilise nos services, sans qu'il soit nécessaire de l'en prévenir formellement.
                    </p>
                    <p className="mt-8 italic font-bold">
                        La présente politique, éditée le 02/03/2026, a été mise à jour le 02/03/2026.
                    </p>
                </div>
            </main>
            <Footer />
        </div>
    );
}
