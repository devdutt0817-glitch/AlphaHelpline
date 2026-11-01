# J.A.R.V.I.S. Chatbot

Marvel ke JARVIS jaisa AI chatbot: HUD-style UI, arc reactor animation, voice input (mic) aur voice reply.
Backend Vercel serverless function hai, isliye API key public code me kabhi expose nahi hoti.

## Structure

```
jarvis-chatbot/
├── api/chat.js        # Backend (API key yaha use hoti hai, server-side)
├── public/
│   ├── index.html     # UI
│   ├── style.css      # JARVIS HUD theme
│   └── app.js         # Chat + voice logic
├── package.json
├── .env.example
└── .gitignore
```

## Deploy: step by step

### Step 1: Groq API key lo (free)
1. https://console.groq.com pe account banao / login karo
2. **API Keys** me jaake new key create karo (`gsk_...` jaisi dikhegi) aur copy kar lo
3. Key sirf ek baar dikhti hai, aur use kabhi chat, screenshot ya GitHub me share mat karna

### Step 2: GitHub pe push karo
```bash
cd jarvis-chatbot
git init
git add .
git commit -m "JARVIS chatbot"
git branch -M main
git remote add origin https://github.com/devdutt0817-glitch/jarvis-chatbot.git
git push -u origin main
```
(Pehle github.com pe `jarvis-chatbot` naam ka empty repo bana lena.)

**Confirm:** GitHub repo me `api/`, `public/`, `package.json` dikhne chahiye. `.env` file nahi dikhni chahiye.

### Step 3: Vercel pe import karo
1. https://vercel.com pe **Continue with GitHub** se login karo
2. **Add New... > Project** pe click karo
3. `jarvis-chatbot` repo ke aage **Import** dabao
4. Framework Preset: **Other** (as is rehne do), Root Directory: `./`
5. **Environment Variables** kholo aur add karo:
   - Name: `GROQ_API_KEY`
   - Value: tumhari `gsk_...` key
6. **Deploy** dabao

**Confirm:** 1 minute baad "Congratulations" screen aur live link aayega, jaise `https://jarvis-chatbot-xxxx.vercel.app`. Wo link kisi ko bhi bhej do, sab use kar sakte hain.

### Step 4: Test karo
- Link kholo, "Hello JARVIS" likho. Reply aana chahiye.
- Mic button dabao aur bolo (Chrome / Edge best hain, mic permission Allow karna).

## Local pe chalana (optional)
```bash
npm i -g vercel
cp .env.example .env.local   # isme apni key daalo
vercel dev
```
Phir http://localhost:3000 kholo.

## Important: kharcha aur safety

Site public hai, to **har visitor ka message tumhari ek Groq key ki free limit use karta hai** (limit sab users me shared hoti hai).
- Free plan ki limits console.groq.com ke limits page pe dekh lo; limit khatam hui to bot kuch der "overloaded" bolega, bill nahi aayega
- Default model `openai/gpt-oss-120b` hai. Badalna ho to Vercel me `GROQ_MODEL` env var daalo
- Zyada traffic aaye to rate limiting add karna (Vercel Firewall ya Upstash Ratelimit)
- Agar key kabhi leak ho jaye, Groq console me delete karke nayi banao aur Vercel me update karke **Redeploy** karo

## Customize
- Personality badalni ho: `api/chat.js` me `SYSTEM_PROMPT`
- Colors: `public/style.css` ke top ke `:root` variables
- Voice: `public/app.js` me `pickVoice()`

## Note
Ye fan-made project hai. "Iron Man" / "J.A.R.V.I.S." Marvel ke trademarks hain, to isse commercially use mat karna.
