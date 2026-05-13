import type { LucideIcon } from "lucide-react";
import {
  Ban, AlertTriangle, AlertCircle, ShieldX, CircleX,
  Shield, ShieldCheck, Check, CheckCircle2,
  Star, Heart, ThumbsUp, ThumbsDown, Award, Trophy, Smile, Sparkles,
  Users, User, UserCheck, UserX, MessageCircle, MessageSquare,
  BookOpen, Book, Music, Palette, Dumbbell, Coffee, Utensils,
  Clock, Timer, AlarmClock, CalendarDays, CalendarClock,
  Smartphone, Monitor, Wifi, Volume2, VolumeX, Tv, Headphones, Camera,
  Home, School, Building2, Bed, Key, Lock, Unlock, Bell, BellOff,
  Info, HelpCircle, FileText, ClipboardList, ListChecks,
  Sun, Moon, Flame, Zap, Leaf, Bike, Trash2, Recycle,
  Hand, Handshake,
  Accessibility, Footprints,
  MapPin, Navigation,
  Pencil, Settings, Plus, Minus, X,
  Eye, EyeOff,
  Laugh, Frown, Meh,
  Baby, PersonStanding,
  Apple, Salad,
  Gamepad2,
  Bike as Bicycle,
  SunMedium,
} from "lucide-react";

export interface IconEntry {
  name: string;
  Icon: LucideIcon;
  keywords: string[];
}

export const ICON_LIST: IconEntry[] = [
  // Divieti / Warning
  { name: "Ban",          Icon: Ban,          keywords: ["no", "vietato", "proibito", "divieto"] },
  { name: "AlertTriangle",Icon: AlertTriangle, keywords: ["attenzione", "pericolo", "avviso"] },
  { name: "AlertCircle",  Icon: AlertCircle,  keywords: ["importante", "alert"] },
  { name: "ShieldX",      Icon: ShieldX,      keywords: ["pericolo", "non sicuro"] },
  { name: "CircleX",      Icon: CircleX,      keywords: ["no", "sbagliato", "errore"] },
  { name: "X",            Icon: X,            keywords: ["no", "chiudi"] },

  // Sicurezza / Positivo
  { name: "Shield",       Icon: Shield,       keywords: ["sicurezza", "protezione"] },
  { name: "ShieldCheck",  Icon: ShieldCheck,  keywords: ["sicuro", "protetto", "ok"] },
  { name: "Check",        Icon: Check,        keywords: ["ok", "fatto", "completato"] },
  { name: "CheckCircle2", Icon: CheckCircle2, keywords: ["ok", "approvato", "fatto"] },
  { name: "Star",         Icon: Star,         keywords: ["stella", "ottimo", "bravo"] },
  { name: "Heart",        Icon: Heart,        keywords: ["cuore", "amore", "rispetto"] },
  { name: "ThumbsUp",     Icon: ThumbsUp,     keywords: ["bene", "bravo", "approvo"] },
  { name: "ThumbsDown",   Icon: ThumbsDown,   keywords: ["male", "non va", "disapprovo"] },
  { name: "Award",        Icon: Award,        keywords: ["premio", "riconoscimento"] },
  { name: "Trophy",       Icon: Trophy,       keywords: ["trofeo", "vincitore", "campione"] },
  { name: "Smile",        Icon: Smile,        keywords: ["felice", "sorriso", "contento"] },
  { name: "Sparkles",     Icon: Sparkles,     keywords: ["speciale", "fantastico", "bravo"] },

  // Persone / Sociale
  { name: "Users",        Icon: Users,        keywords: ["persone", "gruppo", "insieme"] },
  { name: "User",         Icon: User,         keywords: ["persona", "uno"] },
  { name: "UserCheck",    Icon: UserCheck,    keywords: ["approvato", "confermato"] },
  { name: "UserX",        Icon: UserX,        keywords: ["escluso", "bandito"] },
  { name: "Handshake",    Icon: Handshake,    keywords: ["accordo", "rispetto", "patto"] },
  { name: "MessageCircle",Icon: MessageCircle,keywords: ["chat", "parlare", "comunicare"] },
  { name: "MessageSquare",Icon: MessageSquare,keywords: ["messaggio", "testo"] },
  { name: "Hand",         Icon: Hand,         keywords: ["stop", "mano", "alt"] },
  { name: "Accessibility",Icon: Accessibility,keywords: ["accessibilita", "disabilita"] },

  // Attività
  { name: "BookOpen",     Icon: BookOpen,     keywords: ["libro", "leggere", "studiare"] },
  { name: "Book",         Icon: Book,         keywords: ["libro", "manuale"] },
  { name: "Music",        Icon: Music,        keywords: ["musica", "canzone"] },
  { name: "Palette",      Icon: Palette,      keywords: ["arte", "pittura", "disegnare"] },
  { name: "Dumbbell",     Icon: Dumbbell,     keywords: ["sport", "palestra", "allenamento"] },
  { name: "Coffee",       Icon: Coffee,       keywords: ["caffe", "pausa", "bevanda"] },
  { name: "Utensils",     Icon: Utensils,     keywords: ["cibo", "mangiare", "mensa", "pasto"] },
  { name: "Gamepad2",     Icon: Gamepad2,     keywords: ["gioco", "videogiochi"] },
  { name: "Bike",         Icon: Bike,         keywords: ["bici", "sport", "ciclismo"] },
  { name: "Footprints",   Icon: Footprints,   keywords: ["camminare", "passeggiare"] },

  // Tempo
  { name: "Clock",        Icon: Clock,        keywords: ["tempo", "orario", "quando"] },
  { name: "Timer",        Icon: Timer,        keywords: ["conto alla rovescia", "limite"] },
  { name: "AlarmClock",   Icon: AlarmClock,   keywords: ["sveglia", "puntualita"] },
  { name: "CalendarDays", Icon: CalendarDays, keywords: ["calendario", "data", "giorno"] },
  { name: "CalendarClock",Icon: CalendarClock,keywords: ["appuntamento", "orario"] },

  // Tecnologia
  { name: "Smartphone",   Icon: Smartphone,   keywords: ["telefono", "cellulare", "mobile"] },
  { name: "Monitor",      Icon: Monitor,      keywords: ["computer", "schermo", "pc"] },
  { name: "Wifi",         Icon: Wifi,         keywords: ["internet", "connessione", "wifi"] },
  { name: "Volume2",      Icon: Volume2,      keywords: ["volume", "suono", "audio"] },
  { name: "VolumeX",      Icon: VolumeX,      keywords: ["silenzio", "muto", "no suono"] },
  { name: "Tv",           Icon: Tv,           keywords: ["televisione", "tv"] },
  { name: "Headphones",   Icon: Headphones,   keywords: ["cuffie", "audio", "musica"] },
  { name: "Camera",       Icon: Camera,       keywords: ["foto", "fotocamera", "scattare"] },

  // Luoghi / Oggetti
  { name: "Home",         Icon: Home,         keywords: ["casa", "struttura", "dentro"] },
  { name: "School",       Icon: School,       keywords: ["scuola", "istruzione"] },
  { name: "Building2",    Icon: Building2,    keywords: ["edificio", "struttura"] },
  { name: "Bed",          Icon: Bed,          keywords: ["letto", "dormire", "riposo"] },
  { name: "MapPin",       Icon: MapPin,       keywords: ["posto", "luogo", "dove"] },
  { name: "Key",          Icon: Key,          keywords: ["chiave", "accesso"] },
  { name: "Lock",         Icon: Lock,         keywords: ["chiuso", "privato", "segreto"] },
  { name: "Unlock",       Icon: Unlock,       keywords: ["aperto", "libero"] },
  { name: "Bell",         Icon: Bell,         keywords: ["campanello", "notifica", "avviso"] },
  { name: "BellOff",      Icon: BellOff,      keywords: ["silenzioso", "no notifiche"] },

  // Info / Documenti
  { name: "Info",         Icon: Info,         keywords: ["informazione", "sapere"] },
  { name: "HelpCircle",   Icon: HelpCircle,   keywords: ["aiuto", "domanda", "non so"] },
  { name: "FileText",     Icon: FileText,     keywords: ["documento", "file", "foglio"] },
  { name: "ClipboardList",Icon: ClipboardList,keywords: ["lista", "regole", "checklist"] },
  { name: "ListChecks",   Icon: ListChecks,   keywords: ["compiti", "lista", "todo"] },

  // Natura / Varie
  { name: "Sun",          Icon: Sun,          keywords: ["sole", "chiaro", "giorno"] },
  { name: "Moon",         Icon: Moon,         keywords: ["luna", "notte", "scuro"] },
  { name: "Flame",        Icon: Flame,        keywords: ["fuoco", "caldo", "pericolo"] },
  { name: "Zap",          Icon: Zap,          keywords: ["energia", "veloce", "fulmine"] },
  { name: "Leaf",         Icon: Leaf,         keywords: ["natura", "ambiente", "verde"] },
  { name: "Recycle",      Icon: Recycle,      keywords: ["riciclo", "ambiente", "riusa"] },
  { name: "Trash2",       Icon: Trash2,       keywords: ["rifiuti", "spazzatura", "butta"] },

  // Persone (età)
  { name: "Baby",         Icon: Baby,         keywords: ["bambino", "piccolo", "neonato"] },
  { name: "PersonStanding",Icon: PersonStanding,keywords: ["persona", "stare", "uomo"] },

  // Emozioni
  { name: "Laugh",        Icon: Laugh,        keywords: ["ridere", "divertirsi", "allegro"] },
  { name: "Frown",        Icon: Frown,        keywords: ["triste", "dispiaciuto", "male"] },
  { name: "Meh",          Icon: Meh,          keywords: ["indifferente", "cosi cosi"] },
];

export const ICON_MAP: Record<string, LucideIcon> = Object.fromEntries(
  ICON_LIST.map(({ name, Icon }) => [name, Icon]),
);

export const ICON_COLORS = [
  { label: "Predefinito", value: "", preview: "text-gray-700 dark:text-gray-300" },
  { label: "Rosso",       value: "text-red-600",     preview: "text-red-600" },
  { label: "Arancione",   value: "text-orange-500",  preview: "text-orange-500" },
  { label: "Giallo",      value: "text-yellow-500",  preview: "text-yellow-500" },
  { label: "Verde",       value: "text-green-600",   preview: "text-green-600" },
  { label: "Azzurro",     value: "text-sky-500",     preview: "text-sky-500" },
  { label: "Blu",         value: "text-blue-600",    preview: "text-blue-600" },
  { label: "Viola",       value: "text-purple-600",  preview: "text-purple-600" },
  { label: "Rosa",        value: "text-pink-500",    preview: "text-pink-500" },
];

/** Parse icon stored as "lucide:Name:colorClass" or raw emoji */
export function parseLucideIcon(icon: string): { type: "lucide"; name: string; color: string } | { type: "emoji"; value: string } {
  if (icon.startsWith("lucide:")) {
    const parts = icon.split(":");
    return { type: "lucide", name: parts[1] ?? "", color: parts[2] ?? "" };
  }
  return { type: "emoji", value: icon };
}

/** Build the stored icon string for lucide icons */
export function buildLucideIcon(name: string, color: string): string {
  return color ? `lucide:${name}:${color}` : `lucide:${name}`;
}
