# Phase 0: your short setup checklist

These steps are for YOUR computer. This chat uses a separate cloud workspace; installations
here do not install software on your PC. No app installation or deployment is needed yet.
Choose free plans where available; no custom domain is required.

1. [GitHub](https://github.com/signup): create an account and verify your email.
   Send back your GitHub username. I will prepare the repository workflow in Phase 1;
   if you create a repository yourself, make it private and send only its URL.
2. [Supabase](https://supabase.com/dashboard): create an account (GitHub sign-in is fine),
   then a project named `belajarmandarin`. Pick Singapore if available for Malaysia.
   Save the database password in your password manager. Send back only the project URL
   (`https://YOUR-REFERENCE.supabase.co`) and chosen region; no keys or password.
   This project is separate from your future learner account inside the app.
3. [Vercel](https://vercel.com/signup): create an account using GitHub; choose the personal
   Hobby option if offered. Tell me "Vercel ready". We connect the repository in Phase 1.
4. Install [Node.js LTS](https://nodejs.org/en/download) and [Git](https://git-scm.com/downloads)
   for your operating system. LTS means the stable supported edition; use the normal installer.
   Windows: keep Git's PATH/command-line option enabled; use Command Prompt.
   Mac: use Terminal; Git's download page explains its developer-tools option.
   Linux: follow the official page's instructions for your distribution.
   Close and reopen your terminal after installation, then run `node --version`,
   `npm --version` and `git --version`, one command at a time.
5. Install [pnpm](https://pnpm.io/installation) by typing `npm install --global pnpm`.
   Then run `pnpm --version`. If permission is denied, stop and send just the error;
   do not use sudo or change security settings. No other software is required in Phase 0.
6. Reply with: your OS (Windows/Mac/Linux), GitHub username/repository URL if created,
   Supabase project URL + region, "Vercel ready", the four version outputs
   (Node/npm/Git/pnpm), and available model names shown in your Codex model picker.
   These are non-secret values; never include passwords, tokens or secret keys.

## Where settings go later

Once the project folder is on your computer, copy `.env.example` and rename the copy
`.env.local` in that SAME folder (beside AGENTS.md). Open it in a plain-text editor.
Under Supabase project settings / API keys, find the project URL and **publishable** key.
Paste them into `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` inside that file.
Do not paste keys into this chat. The example contains blank values deliberately.

No service-role/secret key or database password is needed now. If privileged migration
tooling later requires one, we will put it in ignored `.env.server.local` and explicitly
load it only from trusted server tooling. Never use a `VITE_` name for a privileged secret.
Vercel deployment settings are configured through its Environment Variables screen later.
Never commit real env files. Account authorization screens are for you to approve yourself.

## Open this project in Codex later

The files prepared here are in `/workspace/mandarin-for-beginner`. This is a cloud path,
not a folder on your own computer. We will transfer/push the prepared project once your
GitHub account is ready; do not recreate the files manually. Open that project folder
in Codex and trust only this project when prompted so project configuration can load.
Tell Codex to list the eight custom agent names. A local catalog check is still pending
if this runtime cannot expose that list. You do not need to install Codex CLI now.
