
import { neon } from "@neondatabase/serverless";
import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";

function obterFirebase() {
  const serviceAccount = JSON.parse(
    process.env.FIREBASE_SERVICE_ACCOUNT_JSON
  );

  const app = getApps().length
    ? getApps()[0]
    : initializeApp({
        credential: cert(serviceAccount)
      });

  return getAuth(app);
}

export default async function handler(req, res) {
  try {
    if (req.method !== "GET" && req.method !== "POST") {
      return res.status(405).json({
        sucesso: false,
        mensagem: "Método não permitido."
      });
    }

    const authorization = req.headers.authorization || "";
    const token = authorization.startsWith("Bearer ")
      ? authorization.slice(7)
      : "";

    if (!token) {
      return res.status(401).json({
        sucesso: false,
        mensagem: "Login necessário."
      });
    }

    const firebaseAuth = obterFirebase();
    const usuario = await firebaseAuth.verifyIdToken(token);
    const uid = usuario.uid;

    const sql = neon(process.env.DATABASE_URL);

    if (req.method === "GET") {
      const resultado = await sql`
        SELECT uid, nome, dados, ranking
        FROM jogadores
        WHERE uid = ${uid}
        LIMIT 1
      `;

      return res.status(200).json({
        sucesso: true,
        jogador: resultado[0] || null
      });
    }

    const body = req.body || {};
    const nome = String(body.nome || usuario.name || "Jogador")
      .slice(0, 40);

    const dados = body.dados;

    if (!dados || typeof dados !== "object" || Array.isArray(dados)) {
      return res.status(400).json({
        sucesso: false,
        mensagem: "Dados do jogador inválidos."
      });
    }

    if (JSON.stringify(dados).length > 1000000) {
      return res.status(413).json({
        sucesso: false,
        mensagem: "Dados muito grandes."
      });
    }

    const ranking =
      body.ranking &&
      typeof body.ranking === "object" &&
      !Array.isArray(body.ranking)
        ? body.ranking
        : {};

    await sql`
      INSERT INTO jogadores
        (uid, nome, dados, ranking, atualizado_em)
      VALUES
        (
          ${uid},
          ${nome},
          ${JSON.stringify(dados)}::jsonb,
          ${JSON.stringify(ranking)}::jsonb,
          NOW()
        )
      ON CONFLICT (uid)
      DO UPDATE SET
        nome = EXCLUDED.nome,
        dados = EXCLUDED.dados,
        ranking = CASE
          WHEN EXCLUDED.ranking = '{}'::jsonb
          THEN jogadores.ranking
          ELSE EXCLUDED.ranking
        END,
        atualizado_em = NOW()
    `;

    return res.status(200).json({
      sucesso: true,
      mensagem: "Jogador salvo no Neon."
    });

  } catch (erro) {
    console.error("Erro na API do jogador:", erro.message);

    return res.status(500).json({
      sucesso: false,
      mensagem: "Erro interno na API."
    });
  }
}
