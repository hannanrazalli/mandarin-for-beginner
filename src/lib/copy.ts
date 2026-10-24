import type { Language } from "./settings";

const ms = {
  sessionExpired: "Sesi 12 jam telah tamat. Log masuk semula untuk meneruskan.",
  account: "Akaun",
  accountTitle: "Ruang peribadi anda.",
  accountBody:
    "Log masuk untuk menyelaraskan kemajuan telefon dan PC. Latihan tanpa akaun kekal pada peranti ini.",
  authMissing: "Akaun awan belum disambungkan.",
  authMissingBody:
    "Sambungan akaun perlu disediakan melalui tetapan projek. Latihan setempat masih tersedia.",
  authChecking: "Sedang menyemak sesi dan akses pemilik…",
  authBlocked: "Akses pemilik tidak dapat disahkan.",
  authBlockedBody:
    "Akaun mesti mempunyai e-mel disahkan dan profil pemilik yang dibenarkan. Hubungi pengurus projek untuk menyemak penyediaan akaun.",
  authError: "Sesi tidak dapat disemak. Semak sambungan dan cuba lagi.",
  authRetry: "Cuba lagi",
  email: "E-mel",
  password: "Kata laluan",
  login: "Log masuk",
  loggingIn: "Sedang log masuk…",
  authInvalid:
    "Masukkan e-mel yang sah dan kata laluan antara 8 hingga 128 aksara.",
  authFailed:
    "Log masuk tidak berjaya. Semak butiran, pengesahan e-mel dan sambungan anda.",
  ownerVerified: "Akses pemilik disahkan",
  ownerBody:
    "Sesi ini telah disahkan. Gunakan akaun belajar yang sama pada telefon dan PC untuk melihat kemajuan yang disegerakkan.",
  logout: "Log keluar tab ini",
  logoutAll: "Log keluar semua sesi",
  loggingOut: "Sedang log keluar…",
  logoutNote:
    "Sesi disimpan dalam tab ini sahaja dan tamat selepas 12 jam. Log keluar semua sesi membatalkan token pembaharuan; token akses sedia ada mungkin kekal sah sehingga tamat tempohnya.",
  loggedOut: "Sesi tab ini telah dipadamkan.",
  globalOut:
    "Permintaan log keluar semua sesi berjaya. Sesi tab ini telah dipadamkan.",
  logoutFailed:
    "Log keluar belum dapat disahkan sepenuhnya. Tutup tab ini. Selepas menyambung internet, log masuk semula dan pilih “Log keluar semua sesi”.",
  previewAccess: "Teruskan latihan setempat",
  noSignup:
    "Tiada pendaftaran awam. Akaun pemilik mesti disediakan oleh pengurus projek.",
  accountSettingsBody: "Semak sambungan awan atau urus sesi pemilik anda.",
  accountDeviceBody:
    "Pilihan paparan disimpan pada peranti ini. Sesi akaun, jika disambungkan, disimpan dalam tab sahaja.",
  home: "Utama",
  learn: "Belajar",
  review: "Ulang kaji",
  stats: "Statistik",
  settings: "Tetapan",
  preview: "Sedia",
  greeting: "Sedikit demi sedikit, kita belajar.",
  intro: "Satu bunyi baharu. Satu langkah kecil.",
  welcome: "Selamat datang ke taman bunyi anda",
  hero: "Kenali bunyi Mandarin",
  heroBody:
    "Mulakan dengan mendengar. Beri ruang untuk mencuba, mengulang dan mengenali nada — mengikut rentak anda.",
  session: "Unit 0 · sesi sasaran 1–3 minit",
  try: "Cuba Unit 0",
  first: "Langkah pertama",
  firstBody: "Tak perlu tahu apa-apa lagi. Rasa ingin tahu sudah memadai.",
  listen: "Dengar dahulu",
  listenBody: "Bunyi dan nada ialah tempat kita bermula.",
  small: "Kecil, tetapi bermakna",
  smallBody: "Ruang belajar yang tenang. Tanpa perlumbaan, tanpa tekanan.",
  path: "Lihat laluan belajar",
  note: "Latihan setempat dan kemajuan akaun dipisahkan",
  learnTitle: "Perjalanan bermula dengan bunyi.",
  learnBody:
    "Sedikit asas, sebelum banyak perkataan. Siapkan pelajaran untuk membuka langkah seterusnya.",
  unit: "Asas bunyi dan nada",
  planned: "Asas pembelajaran",
  initial: "Initial dan final",
  tones: "Empat nada + nada neutral",
  pairs: "Pasangan nada",
  sandhi: "Perubahan nada 不 / 一",
  coming: "Akan datang",
  locked: "Siapkan pelajaran sebelumnya untuk membuka langkah ini.",
  reviewTitle: "Beri ingatan ruang untuk tumbuh.",
  reviewEmpty: "Belum ada bahan untuk diulang kaji.",
  reviewBody:
    "Siapkan pelajaran perkataan dahulu. Ulang kaji akan muncul mengikut jadual ingatan anda.",
  statsTitle: "Setiap langkah ada waktunya.",
  statsEmpty: "Belum ada data pembelajaran",
  statsBody: "Rekod bermula selepas anda menjawab pelajaran atau ulang kaji.",
  settingsTitle: "Jadikan ruang ini milik anda.",
  settingsBody: "Pilihan kecil untuk belajar dengan selesa.",
  language: "Bahasa antara muka",
  theme: "Rupa paparan",
  system: "Sistem",
  light: "Cerah",
  dark: "Gelap",
  effects: "Kesan bunyi",
  effectsBody: "Dimatikan secara lalai. Tidak mengawal audio pelajaran.",
  saved: "Pilihan disimpan pada peranti ini.",
  notSaved:
    "Pilihan digunakan untuk sesi ini sahaja. Storan peranti tidak tersedia.",
  device: "Pada peranti anda sahaja",
  deviceBody:
    "Pilihan paparan kekal pada peranti ini; kemajuan akaun menggunakan login yang sama.",
  sample: "Contoh paparan · kandungan dan audio belum disahkan",
  hello: "Helo",
  audio:
    "Audio menggunakan suara Mandarin peranti dan belum disahkan melalui semakan pendengaran.",
  audioBody:
    "Dengar contoh pada kadar biasa atau perlahan, kemudian baca penerangan nada.",
  back: "Lihat laluan belajar",
  previewTitle: "Dengar dahulu.",
  previewBody: "Kenali ruang belajar anda, satu bunyi pada satu masa.",
  unavailable: "Dengar contoh · belum tersedia",
  next: "Apa yang akan dipelajari?",
  nextBody:
    "Asas bunyi, cara nada berubah, dan peluang untuk mendengar serta mencuba lagi.",
  install: "Pasang aplikasi",
  installBody:
    "Buka menu pelayar untuk pilihan pemasangan. Pada iPhone: Kongsi → Tambah ke Skrin Utama.",
  update: "Versi baharu tersedia.",
  reload: "Kemas kini",
  later: "Nanti",
  skip: "Langkau ke kandungan",
  loading: "Sedang memuatkan…",
  notFound: "Halaman tidak ditemui.",
  return: "Kembali ke Utama",
  error: "Aplikasi tidak dapat dibuka. Cuba lagi.",
};
const en: typeof ms = {
  sessionExpired:
    "Your 12-hour session has expired. Sign in again to continue.",
  account: "Account",
  accountTitle: "Your personal space.",
  accountBody:
    "Sign in to sync progress between your phone and PC. Practice without an account stays on this device.",
  authMissing: "Cloud account is not connected yet.",
  authMissingBody:
    "The account connection needs to be configured in project settings. Local practice remains available.",
  authChecking: "Checking the session and owner access…",
  authBlocked: "Owner access could not be verified.",
  authBlockedBody:
    "The account needs a confirmed email and an authorized owner profile. Ask the project administrator to check account provisioning.",
  authError:
    "The session could not be checked. Check your connection and try again.",
  authRetry: "Try again",
  email: "Email",
  password: "Password",
  login: "Sign in",
  loggingIn: "Signing in…",
  authInvalid:
    "Enter a valid email and a password between 8 and 128 characters.",
  authFailed:
    "Sign in failed. Check your details, email confirmation and connection.",
  ownerVerified: "Owner access verified",
  ownerBody:
    "This session is verified. Use the same learner account on your phone and PC to see synced progress.",
  logout: "Sign out of this tab",
  logoutAll: "Sign out of all sessions",
  loggingOut: "Signing out…",
  logoutNote:
    "Your session is stored in this tab only and expires after 12 hours. Signing out of all sessions revokes refresh tokens; existing access tokens may remain valid until they expire.",
  loggedOut: "This tab’s session has been cleared.",
  globalOut:
    "The request to sign out of all sessions succeeded. This tab’s session has been cleared.",
  logoutFailed:
    "Sign-out could not be fully confirmed. Close this tab. After reconnecting, sign in again and choose “Sign out of all sessions”.",
  previewAccess: "Continue local practice",
  noSignup:
    "There is no public signup. The owner account must be provisioned by the project administrator.",
  accountSettingsBody:
    "Check the cloud connection or manage your owner session.",
  accountDeviceBody:
    "Display preferences are saved on this device. Account sessions, when connected, are stored in this tab only.",
  home: "Home",
  learn: "Learn",
  review: "Review",
  stats: "Statistics",
  settings: "Settings",
  preview: "Ready",
  greeting: "Little by little, we learn.",
  intro: "One new sound. One small step.",
  welcome: "Welcome to your sound garden",
  hero: "Meet the sounds of Mandarin",
  heroBody:
    "Start by listening. Make room to try, repeat and discover tones — at your own pace.",
  session: "Unit 0 · target session 1–3 minutes",
  try: "Try Unit 0",
  first: "Your first step",
  firstBody: "You don’t need to know anything yet. Curiosity is enough.",
  listen: "Listen first",
  listenBody: "Sounds and tones are where we begin.",
  small: "Small, but meaningful",
  smallBody: "A calm learning space. No race, no pressure.",
  path: "Explore the learning path",
  note: "Local practice and account progress stay separate",
  learnTitle: "Your journey starts with sound.",
  learnBody:
    "A little foundation before many words. Complete lessons to unlock your next steps.",
  unit: "Sounds and tones",
  planned: "Learning foundations",
  initial: "Initials and finals",
  tones: "Four tones + neutral tone",
  pairs: "Tone pairs",
  sandhi: "Tone changes 不 / 一",
  coming: "Coming soon",
  locked: "Complete earlier lessons to unlock this step.",
  reviewTitle: "Give your memory room to grow.",
  reviewEmpty: "Nothing to review yet.",
  reviewBody:
    "Complete vocabulary lessons first. Reviews appear according to your memory schedule.",
  statsTitle: "Every step has its own time.",
  statsEmpty: "No learning data yet",
  statsBody: "Records begin after you answer lessons or reviews.",
  settingsTitle: "Make this space your own.",
  settingsBody: "Small choices to help you learn comfortably.",
  language: "Interface language",
  theme: "Appearance",
  system: "System",
  light: "Light",
  dark: "Dark",
  effects: "Sound effects",
  effectsBody: "Off by default. Does not control lesson audio.",
  saved: "Preferences saved on this device.",
  notSaved:
    "Preferences apply to this session only. Device storage is unavailable.",
  device: "Only on your device",
  deviceBody:
    "Display choices stay on this device; account progress uses the same login.",
  sample: "Display example · content and audio are unverified",
  hello: "Hello",
  audio:
    "Audio uses your device’s Mandarin voice and has not passed a listening review.",
  audioBody: "Listen at normal or slow speed, then read the tone explanation.",
  back: "View learning path",
  previewTitle: "Listen first.",
  previewBody: "Discover your learning space, one sound at a time.",
  unavailable: "Listen to example · unavailable",
  next: "What will you learn?",
  nextBody:
    "Sound foundations, how tones change, and room to listen and try again.",
  install: "Install app",
  installBody:
    "Open your browser menu for installation options. On iPhone: Share → Add to Home Screen.",
  update: "A new version is available.",
  reload: "Update",
  later: "Later",
  skip: "Skip to content",
  loading: "Loading…",
  notFound: "Page not found.",
  return: "Return home",
  error: "The app could not open. Please try again.",
};
export function copy(language: Language) {
  return language === "ms" ? ms : en;
}
