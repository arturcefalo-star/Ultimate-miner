
import { neon } from "@neondatabase/serverless";

export default async function handler(req, res) {
  try {
    const sql = neon(process.env.DATABASE_URL);

    const resultado = await sql`SELECT NOW() AS horario`;

    return res.status(200).json({
      sucesso: true,
      mensagem: "Conectado ao Neon!",
      horario: resultado[0].horario
    });
  } catch (erro) {
    console.error("Erro na conexão:", erro);

    return res.status(500).json({
      sucesso: false,
      mensagem: "Erro ao conectar ao banco de dados."
    });
  }
}
