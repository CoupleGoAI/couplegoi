# Local Development Setup

Two paths depending on your OS. Both end up in the same place.

---

## Prerequisites (everyone)

- Node 20+
- Docker Desktop running
- Expo Go on your phone

---

## Mac / Linux

### 1. Install the Supabase CLI

```bash
brew install supabase/tap/supabase
```

### 2. Install dependencies

```bash
npm install
```

### 3. Set up env files

Create `supabase/functions/.env`:

```env
AI_PROVIDER=groq
GROQ_API_KEY=<your key>
MESSAGES_ENCRYPTION_KEY=<your key>
ALLOWED_ORIGIN=*
```

`.env.local` is auto-generated in step 5 — no action needed.

### 4. Upload prompt templates (first time only)

Start Supabase, then open the local dashboard at `http://127.0.0.1:54323`:
- Go to **Storage** → **New bucket** → name it `prompts` → enable **Public**
- Upload `supabase/prompts/chat_solo.txt` and `supabase/prompts/chat_couple.txt`

### 5. Start everything

```bash
npm run dev
```

This automatically:
- Starts local Supabase if it isn't running
- Writes `.env.local` pointing at your local instance
- Starts Expo

### 6. Start edge functions with secrets (separate terminal)

```bash
supabase functions serve --env-file supabase/functions/.env
```

Scan the QR code in Expo Go and you're running.

---

## Windows (WSL2)

WSL adds two extra steps: installing Homebrew and fixing the Supabase URL so your phone can reach the local instance.

### 1. Install Homebrew in WSL

```bash
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
```

Add it to your PATH (add the second line to `~/.bashrc` permanently):

```bash
eval "$(/home/linuxbrew/.linuxbrew/bin/brew shellenv)"
echo 'eval "$(/home/linuxbrew/.linuxbrew/bin/brew shellenv)"' >> ~/.bashrc
```

### 2. Install the Supabase CLI

```bash
brew install supabase/tap/supabase
```

### 3. Install dependencies

```bash
npm install
```

### 4. Set up env files

Create `supabase/functions/.env`:

```env
AI_PROVIDER=groq
GROQ_API_KEY=<your key>
MESSAGES_ENCRYPTION_KEY=<your key>
ALLOWED_ORIGIN=*
```

### 5. Find your Windows LAN IP

Run `ipconfig` on Windows (or `! ipconfig` in this terminal) and find the **IPv4 Address** under your active Ethernet or Wi-Fi adapter — e.g. `192.168.1.123`.

### 6. Start Supabase

```bash
supabase start
```

### 7. Fix `.env.local`

The start script writes `127.0.0.1` as the Supabase URL, but your phone can't reach that. Edit `.env.local` and replace it with your Windows LAN IP:

```env
EXPO_PUBLIC_SUPABASE_URL=http://192.168.1.123:54321
```

### 8. Upload prompt templates (first time only)

Open `http://127.0.0.1:54323` in your browser:
- Go to **Storage** → **New bucket** → name it `prompts` → enable **Public**
- Upload `supabase/prompts/chat_solo.txt` and `supabase/prompts/chat_couple.txt`

### 9. Start Expo with tunnel

WSL can't use LAN mode — tunnel is required:

```bash
npx expo start --tunnel
```

Do NOT use `npm run dev` here — it will overwrite `.env.local` and put `127.0.0.1` back.

### 10. Start edge functions with secrets (separate terminal)

```bash
supabase functions serve --env-file supabase/functions/.env
```

Scan the QR code in Expo Go and you're running against local Supabase.

---

## Subsequent runs (WSL)

Supabase remembers its Docker containers, so subsequent starts are fast:

1. Make sure Docker Desktop is running
2. Fix `.env.local` if needed (check `EXPO_PUBLIC_SUPABASE_URL` is your LAN IP)
3. Terminal 1: `npx expo start --tunnel`
4. Terminal 2: `supabase functions serve --env-file supabase/functions/.env`

---

## npm scripts reference

| Command | What it does |
|---|---|
| `npm run dev` | Start local Supabase + Expo (Mac/Linux only) |
| `npm run prod` | Start Expo pointing at prod Supabase |
| `npm run prod:groq` | Prod with Groq as AI provider |
| `npm run prod:claude` | Prod with Claude as AI provider |
| `node scripts/help.mjs` | Print all available commands |
