import {PrismaClient, UserRole} from "../generated/prisma/index.js";
import bcrypt from "bcryptjs";

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
        data: TAGS.map((name) => ({name})),
        skipDuplicates: true,
    });
    console.log(`Tags: ${result.count} created, ${TAGS.length - result.count} already existed`);

    const mainStructureName = 'Limonaia';
    let mainStructure = await prisma.structure.findFirst({
        where: {
            name: mainStructureName,
        }
    })
    if (!mainStructure) {
        mainStructure = await prisma.structure.create({
            data: {
                name: mainStructureName,
            }
        })
    }

    const RULES = [
        {icon: "composite:Cigarette,Ban:red", text: "Non puoi fumare"},
        {icon: "composite:Syringe,Ban:red", text: "Non puoi portare droghe"},
        {icon: "composite:Wine,Ban:red", text: "Non puoi portare alcol"},
        {icon: "composite:Users,Ban:red", text: "Non puoi portare ospiti"},
        {icon: "lucide:BrushCleaning:green", text: "Cerca di lasciare pulito"},
        {icon: "lucide:Volume1:blue", text: "Rispetta gli altri: non urlare"},
        {icon: "lucide:Bed:blue", text: "Tutti a letto entro le *immettere ora"},
        {icon: "composite:Home", text: "Devi essere nella struttura entro le *immettere ora"},
        {
            icon: "lucide:Utensils:green",
            text: "Sei con altre persone: prendi la giusta quantità di cibo e mangia in cucina"
        },
        {icon: "lucide:Wallet:green", text: "Usa quello che hai in modo responsabile"},
        {icon: "lucide:BookOpen:blue", text: "Studiare è fondamentale"},
        {icon: "lucide:HeartHandshake:pink", text: "Sii gentile e disponibile"},
        {icon: "lucide:Ear:sky", text: "Sii sempre disposto ad ascoltare"},
    ];

    const rulesResult = await prisma.rule.createMany({
        data: RULES.map((r, i) => ({...r, order: i, structureId: mainStructure.id})),
        skipDuplicates: true,
    });
    console.log(`Rules: ${rulesResult.count} created`);

    const adminUserPassword = process.env.ADMIN_USER_PASSWORD ?? `admin`;
    let mainTutorUser = await prisma.user.findFirst({
        where: {
            username: `admin`,
        }
    })
    if (!mainTutorUser) {
        mainTutorUser = await prisma.user.create({
            data: {
                name: `ADMIN`,
                username: `admin`,
                email: `admin@admin.admin`,
                password: bcrypt.hashSync(adminUserPassword, 10),
                role: UserRole.ADMIN,
                mustChangePassword: false,
                structureId: mainStructure.id,
            },
        })
        console.log(`Created #${mainTutorUser.id} ADMIN user name=${mainTutorUser.name} password=${adminUserPassword}`)
    }

}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(() => prisma.$disconnect());
