import { PrismaClient } from "../generated/prisma/index.js";

const prisma = new PrismaClient();

const TAGS = [
  "⚽ Sport",
  "🎵 Musica",
  "🎨 Creatività",
  "✂️ Manualità",
  "🎮 Giochi",
  "🍳 Cucina",
  "🌳 Natura",
  "🎬 Film",
  "📚 Lettura",
  "💃 Ballo",
  "🧩 Relax",
  "🚌 Gita",
  "😌 Tranquillo",
  "🔇 Silenzioso",
  "👥 Piccolo gruppo",
  "🫶 Supportato",
  "🏠 Sicuro",
  "⏰ Breve",
  "🪑 Pause",
  "🌤️ All'aperto",
  "🧭 Guidato",
  "🚶 Libero",
  "🔊 Rumoroso",
  "💡 Luci forti",
  "🤫 Calmo",
  "👂 Voce bassa",
  "🎧 Cuffie ok",
  "🤝 Insieme",
  "🙂 Nuovi amici",
  "👤 Individuale",
  "👨‍🏫 Educatori",
  "🎧 Rumori possibili",
  "💡 Stimoli forti",
  "🙂 In gruppo",
  "🌱 Crescita",
  "🧭 Autonomia",
  "📚 Apprendimento",
  "❤️ Benessere",
];

async function main() {
  const result = await prisma.eventTag.createMany({
    data: TAGS.map((name) => ({ name })),
    skipDuplicates: true,
  });

  console.log(`Tags: ${result.count} created, ${TAGS.length - result.count} already existed`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
