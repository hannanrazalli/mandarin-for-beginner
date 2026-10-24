import type { Language } from "../lib/settings";

const ms = {
  local: "Latihan setempat · peranti ini sahaja",
  cloud: "Kemajuan akaun pemilik",
  start: "Mula pelajaran",
  resume: "Sambung belajar",
  overview: "Asas dahulu, selangkah demi selangkah.",
  overviewBody:
    "Kenali bunyi dan nada sebelum 20 perkataan pertama. Lengkapkan setiap pelajaran dengan sekurang-kurangnya 80% jawapan pertama tepat untuk membuka langkah seterusnya.",
  complete: "Selesai",
  locked: "Lengkapkan pelajaran sebelumnya",
  ready: "Sedia untuk dicuba",
  card: "Kenali dahulu",
  reveal: "Penerangan",
  question: "Cuba soalan",
  choosePinyin: "Pilih pinyin yang sepadan.",
  chooseMeaning: "Pilih maksud dalam Bahasa Melayu.",
  listening: "Dengar suara peranti, kemudian pilih jawapan.",
  correct: "Ya, tepat.",
  incorrect: "Belum tepat. Mari cuba lagi.",
  firstNote:
    "Ketepatan menggunakan jawapan pertama sahaja. Ulangan membantu anda belajar.",
  retry: "Cuba lagi",
  next: "Seterusnya",
  result: "Satu langkah sudah dicuba.",
  accuracy: "Ketepatan jawapan pertama",
  passed: "Asas ini sudah dilengkapkan.",
  notPassed: "Cuba semula pelajaran untuk mencapai 80%. Tiada had percubaan.",
  repeat: "Ulang pelajaran",
  back: "Laluan belajar",
  audio: "Suara peranti · sebutan belum disahkan",
  noVoice:
    "Suara Mandarin zh-CN tidak tersedia. Anda boleh terus belajar melalui teks.",
  audioError: "Suara peranti gagal dimainkan. Cuba lagi atau gunakan teks.",
  play: "Dengar",
  slow: "Perlahan",
  stop: "Henti",
  malay: "Penerangan pembelajaran dalam Bahasa Melayu.",
  review: "Bahan ini masih memerlukan semakan guru.",
  saving: "Sedang menghantar jawapan…",
  pending:
    "Simpanan awan dan XP belum dapat disahkan; permintaan mungkin telah diproses. Cuba hantar semula peristiwa yang sama di halaman ini untuk menyemak keputusan tanpa menggandakan ganjaran.",
  send: "Hantar semula",
  saved: "Jawapan disahkan oleh pelayan",
  xp: "XP diberikan pelayan",
  localSaved: "Latihan disimpan pada peranti ini. Ini bukan kemajuan akaun.",
  storageFailed:
    "Latihan untuk sesi ini sahaja; storan peranti tidak tersedia.",
  loading: "Sedang memuatkan kemajuan akaun…",
  cloudError:
    "Kemajuan awan tidak dapat dimuatkan. Semak sambungan sebelum meneruskan.",
  noLesson: "Pelajaran tidak ditemui.",
  intro: "Bunyi menjadi asas.",
  introBody:
    "Mulakan dengan b, p dan m. Dengar jika suara Mandarin tersedia, baca penerangan, kemudian cuba tiga soalan pendek.",
  newContent: "95 pelajaran ringkas · Unit 0 dahulu",
  tone: "Nota nada",
  answer: "Jawapan",
  notAudio:
    "Rakaman penutur asli belum tersedia. Sintesis peranti bukan penilaian sebutan.",
};
const en: typeof ms = {
  local: "Local practice · this device only",
  cloud: "Owner account progress",
  start: "Start lesson",
  resume: "Continue learning",
  overview: "Foundations first, one small step at a time.",
  overviewBody:
    "Discover sounds and tones before your first 20 words. Complete each lesson with at least 80% first-answer accuracy to unlock the next step.",
  complete: "Completed",
  locked: "Complete the previous lessons",
  ready: "Ready to try",
  card: "Get to know it first",
  reveal: "Explanation",
  question: "Try the question",
  choosePinyin: "Choose the matching pinyin.",
  chooseMeaning: "Choose the English meaning.",
  listening: "Listen to the device voice, then choose an answer.",
  correct: "Yes, that’s right.",
  incorrect: "Not quite. Let’s try again.",
  firstNote: "Accuracy uses your first answer only. Retries help you learn.",
  retry: "Try again",
  next: "Next",
  result: "You have taken a step.",
  accuracy: "First-answer accuracy",
  passed: "These foundations are completed.",
  notPassed: "Try the lesson again to reach 80%. There is no attempt limit.",
  repeat: "Repeat lesson",
  back: "Learning path",
  audio: "Device voice · pronunciation unverified",
  noVoice:
    "A Mandarin zh-CN voice is unavailable. You can keep learning with text.",
  audioError: "The device voice could not play. Try again or use the text.",
  play: "Listen",
  slow: "Slow",
  stop: "Stop",
  malay: "Explanations and meanings follow your interface language.",
  review: "This content still needs teacher review.",
  saving: "Submitting answers…",
  pending:
    "Cloud saving and XP are not confirmed; the request may already have been processed. Retry the same event on this page to confirm the result without duplicating rewards.",
  send: "Retry submission",
  saved: "Answers verified by the server",
  xp: "XP awarded by server",
  localSaved:
    "Practice saved on this device. This is separate from account progress.",
  storageFailed:
    "Practice is available for this session only; device storage is unavailable.",
  loading: "Loading account progress…",
  cloudError:
    "Cloud progress could not load. Check your connection before continuing.",
  noLesson: "Lesson not found.",
  intro: "Sound is the foundation.",
  introBody:
    "Begin with b, p and m. Listen if a Mandarin voice is available, read the explanation, then try three short questions.",
  newContent: "95 short lessons · Unit 0 first",
  tone: "Tone note",
  answer: "Answer",
  notAudio:
    "Native-speaker recordings are not available yet. Device synthesis does not assess pronunciation.",
};
export function learningCopy(language: Language) {
  return language === "ms" ? ms : en;
}
