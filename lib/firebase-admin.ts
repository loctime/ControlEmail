/**
 * Firebase Admin SDK para verificar tokens de Firebase Auth en el servidor.
 * Usa las mismas variables de entorno que Firestore (FIREBASE_ADMIN_* o GOOGLE_*).
 */

import * as admin from "firebase-admin"

function getFirebaseAdminApp(): admin.app.App {
  if (admin.apps?.length > 0) {
    return admin.app()
  }
  const clientEmail =
    process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL ?? process.env.FIREBASE_ADMIN_CLIENT_EMAIL
  const privateKey = (
    process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY ?? process.env.FIREBASE_ADMIN_PRIVATE_KEY ?? ""
  ).replace(/\\n/g, "\n")

  if (!clientEmail || !privateKey) {
    throw new Error(
      "Missing Firebase Admin credentials: set GOOGLE_SERVICE_ACCOUNT_EMAIL and GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY (or FIREBASE_ADMIN_*)"
    )
  }

  return admin.initializeApp({
    credential: admin.credential.cert({
      clientEmail,
      privateKey,
      projectId:
        process.env.FIREBASE_PROJECT_ID ?? process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    }),
  })
}

export function getFirebaseAuth() {
  const app = getFirebaseAdminApp()
  return admin.auth(app)
}

export interface DecodedIdToken {
  uid: string
  email?: string
}

/**
 * Verifica el ID token de Firebase y devuelve el token decodificado.
 * Lanza si el token es inválido o expirado.
 */
export async function verifyIdToken(idToken: string): Promise<DecodedIdToken> {
  const auth = getFirebaseAuth()
  const decoded = await auth.verifyIdToken(idToken)
  return {
    uid: decoded.uid,
    email: decoded.email ?? undefined,
  }
}
