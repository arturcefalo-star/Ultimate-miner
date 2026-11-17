
import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";

export default async function handler(req, res) {
  try {
    const serviceAccount = JSON.parse(
      process.env.FIREBASE_SERVICE_ACCOUNT_JSON
    );

    const app = getApps().length
      ? getApps()[0]
      : initializeApp({
          credential: cert(serviceAccount)
        });

    await getAuth(app).listUsers(1);

    return res.status(200).json({
      sucesso: true,
      mensagem: "Firebase conectado com sucesso!"
    });
  } catch (erro) {
    console.error("Erro Firebase:", erro.message);

    return res.status(500).json({
      sucesso: false,
      mensagem: "Falha na conexão com Firebase."
    });
  }
}
