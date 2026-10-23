import type { Language } from "./settings";

const ms = {
  sessionExpired: "Sesi 12 jam telah tamat. Log masuk semula untuk meneruskan.",
  account: "Akaun",
  accountTitle: "Ruang peribadi anda.",
  accountBody:
    "Log masuk hanya untuk pemilik yang telah disediakan. Pratonton awam boleh diteroka tanpa akaun.",
  authMissing: "Akaun awan belum disambungkan.",
  authMissingBody:
    "Pratonton masih tersedia. Pemilik boleh menambah URL projek Supabase dan kunci publishable awam melalui tetapan persekitaran aplikasi, kemudian membina semula aplikasi. Jangan masukkan kunci rahsia.",
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
    "Sesi ini telah disemak dengan pelayan. Tiada data pembelajaran awan ditambah dalam pratonton ini.",
  logout: "Log keluar tab ini",
  logoutAll: "Log keluar semua sesi",
  loggingOut: "Sedang log keluar…",
  logoutNote:
    "Sesi disimpan dalam tab ini sahaja dan tamat selepas 12 jam. Log keluar semua sesi membatalkan token pembaharuan; token akses sedia ada mungkin kekal sah sehingga tamat tempohnya.",
  loggedOut: "Sesi tab ini telah dipadamkan.",
  globalOut:
    "Permintaan log keluar semua sesi berjaya. Sesi tab ini telah dipadamkan.",
  logoutFailed:
    "Data sesi setempat telah dipadamkan. Pembatalan sesi pelayan tidak dapat disahkan. Sambung semula ke internet, log masuk semula, kemudian pilih “Log keluar semua sesi”.",
  previewAccess: "Teroka pratonton awam",
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
  preview: "Pratonton",
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
  note: "Shell pratonton · tiada rekod pembelajaran disimpan",
  learnTitle: "Perjalanan bermula dengan bunyi.",
  learnBody:
    "Sedikit asas, sebelum banyak perkataan. Inilah laluan yang dirancang.",
  unit: "Asas bunyi dan nada",
  planned: "Skop dirancang",
  initial: "Initial dan final",
  tones: "Empat nada + nada neutral",
  pairs: "Pasangan nada",
  sandhi: "Perubahan nada 不 / 一",
  coming: "Akan datang",
  locked: "Akan datang selepas asas Unit 0 disiapkan.",
  reviewTitle: "Beri ingatan ruang untuk tumbuh.",
  reviewEmpty: "Belum ada bahan untuk diulang kaji.",
  reviewBody:
    "Kandungan ulang kaji akan tersedia apabila pelajaran sebenar ditambah.",
  statsTitle: "Setiap langkah ada waktunya.",
  statsEmpty: "Belum ada data pembelajaran",
  statsBody:
    "Pratonton ini tidak mengukur pencapaian. Rekod akan bermula apabila pelajaran sebenar tersedia.",
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
  deviceBody: "Tiada akaun atau penyegerakan dalam pratonton ini.",
  sample: "Contoh paparan · kandungan dan audio belum disahkan",
  hello: "Helo",
  audio: "Audio pelajaran belum tersedia atau disahkan.",
  audioBody:
    "Contoh ini menunjukkan rupa paparan. Pelajaran penuh akan bermula dengan asas bunyi, bukan contoh ini.",
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
  error: "Pratonton tidak dapat dibuka. Cuba lagi.",
};
const en: typeof ms = {
  sessionExpired:
    "Your 12-hour session has expired. Sign in again to continue.",
  account: "Account",
  accountTitle: "Your personal space.",
  accountBody:
    "Sign in is reserved for the provisioned owner. The public preview can be explored without an account.",
  authMissing: "Cloud account is not connected yet.",
  authMissingBody:
    "The preview remains available. The owner can add the Supabase project URL and public publishable key in the app environment settings, then rebuild the app. Never enter a secret key.",
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
    "This session was checked with the server. No cloud learning data is added in this preview.",
  logout: "Sign out of this tab",
  logoutAll: "Sign out of all sessions",
  loggingOut: "Signing out…",
  logoutNote:
    "Your session is stored in this tab only and expires after 12 hours. Signing out of all sessions revokes refresh tokens; existing access tokens may remain valid until they expire.",
  loggedOut: "This tab’s session has been cleared.",
  globalOut:
    "The request to sign out of all sessions succeeded. This tab’s session has been cleared.",
  logoutFailed:
    "Local session data has been removed. Server session revocation could not be confirmed. Reconnect, sign in again, then choose “Sign out of all sessions”.",
  previewAccess: "Explore the public preview",
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
  preview: "Preview",
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
  note: "Preview shell · no learning records are saved",
  learnTitle: "Your journey starts with sound.",
  learnBody:
    "A little foundation, before many words. Here is the planned path.",
  unit: "Sounds and tones",
  planned: "Planned scope",
  initial: "Initials and finals",
  tones: "Four tones + neutral tone",
  pairs: "Tone pairs",
  sandhi: "Tone changes 不 / 一",
  coming: "Coming soon",
  locked: "Coming after the foundations of Unit 0 are completed.",
  reviewTitle: "Give your memory room to grow.",
  reviewEmpty: "Nothing to review yet.",
  reviewBody: "Review material will be available when real lessons are added.",
  statsTitle: "Every step has its own time.",
  statsEmpty: "No learning data yet",
  statsBody:
    "This preview does not measure achievement. Records will begin when real lessons are available.",
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
  deviceBody: "There is no account or sync in this preview.",
  sample: "Display example · content and audio are unverified",
  hello: "Hello",
  audio: "Lesson audio is not available or verified yet.",
  audioBody:
    "This example shows the interface. Full lessons will begin with sound foundations, rather than this example.",
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
  error: "The preview could not open. Please try again.",
};
export function copy(language: Language) {
  return language === "ms" ? ms : en;
}
