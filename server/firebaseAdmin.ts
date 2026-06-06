/**
 * Firebase Admin SDK — server-side uniquement.
 * Permet les opérations Firestore sans règles de sécurité (droits root).
 *
 * Prérequis : définir GOOGLE_APPLICATION_CREDENTIALS dans .env.local
 * pointant vers le fichier service account JSON téléchargé depuis
 * Firebase Console → Paramètres → Comptes de service → Générer une clé.
 */
import * as admin from 'firebase-admin';
import * as path from 'path';
import * as fs from 'fs';

function initAdmin(): admin.app.App {
    if (admin.apps.length > 0) return admin.apps[0]!;

    const certPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;

    if (certPath) {
        try {
            const resolvedPath = path.isAbsolute(certPath)
                ? certPath
                : path.resolve(process.cwd(), certPath);

            const serviceAccount = JSON.parse(fs.readFileSync(resolvedPath, 'utf-8')) as Record<string, unknown>;

            return admin.initializeApp({
                credential: admin.credential.cert(serviceAccount as admin.ServiceAccount),
                projectId: serviceAccount.project_id as string,
            });
        } catch (e) {
            console.error('[FirebaseAdmin] Impossible de charger le service account :', e);
        }
    }

    console.warn('[FirebaseAdmin] GOOGLE_APPLICATION_CREDENTIALS non défini — les suppressions Firestore échoueront en prod.');
    return admin.initializeApp();
}

initAdmin();

export const adminDb = admin.firestore();
