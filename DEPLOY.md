# Bepul joylash: Vercel + Turso

Natija: `https://<loyiha-nomi>.vercel.app` manzilida ishlaydigan sayt, ma'lumotlar bazasi bilan.
Ikkala xizmat ham bepul, karta talab qilinmaydi. Taxminan 15 daqiqa.

> Vercel'ning bepul (Hobby) tarifi shaxsiy, notijorat loyihalar uchun. Sinov va portfolio uchun yetadi.
> Agar keyinchalik haqiqiy mijozlar bilan pul ishlaydigan sayt bo'lsa, Pro tarifga o'tish kerak bo'ladi.

## 1. Ma'lumotlar bazasi — Turso (bepul)

1. https://app.turso.tech ga kiring (GitHub akkaunt bilan).
2. **Create Database** → nom: `chameleon` → eng yaqin hudud (masalan, Frankfurt) → Create.
3. Baza sahifasida **URL**'ni nusxalang — `libsql://chameleon-<username>.turso.io` ko'rinishida.
4. **Create Token** (Read & Write) → tokenni nusxalang. Bu maxfiy — hech kimga, chatga ham yubormang.

Jadvallarni yaratish shart emas — sayt birinchi so'rovda o'zi yaratadi (migratsiyalar).

## 2. Maxfiy kalit (AUTH_SECRET)

Loyiha papkasida terminalda:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"
```

Chiqqan qatorni saqlab qo'ying.

## 3. Vercel'ga joylash

```bash
npx vercel login
```

Brauzer ochiladi — GitHub yoki email bilan kiring. Keyin loyiha papkasida:

```bash
npx vercel link
```

Savollarga: *Set up* → **Y**, scope → o'zingiz, *Link to existing project* → **N**, nom → masalan `chameleon-engine`.
Bu nom manzilga aylanadi: `chameleon-engine.vercel.app` (band bo'lsa, boshqa nom tanlang).

Endi sozlamalarni qo'shing (har biri qiymatni so'raydi — nusxalaganingizni joylang):

```bash
npx vercel env add AUTH_SECRET production
```

```bash
npx vercel env add DATABASE_URL production
```

```bash
npx vercel env add DATABASE_AUTH_TOKEN production
```

```bash
npx vercel env add NEXT_PUBLIC_FIVERR_URL production
```

Va joylang:

```bash
npx vercel --prod
```

Oxirida `https://chameleon-engine.vercel.app` manzili chiqadi. Tayyor.

## 4. Tekshirish

1. Saytni oching → **Sign up free** → akkaunt yarating.
2. Bosh sahifada **Simulate lead** va **$1 test to'lov** → kabinetda paydo bo'lishi kerak.
3. Kabinet → Settings → Slack / webhook / Telegram'ni ulang → **Send test**.

## Keyinchalik o'zgartirish kiritsangiz

```bash
npx vercel --prod
```

## Ixtiyoriy

- **Stripe test to'lovlari**: `npx vercel env add STRIPE_SECRET_KEY production` (faqat `sk_test_...`).
- **Anonim demo arizalar uchun xabarnoma**: `DEMO_SLACK_WEBHOOK_URL`, `DEMO_TELEGRAM_BOT_TOKEN`, `DEMO_TELEGRAM_CHAT_ID`.
- **O'z domeningiz** (pullik, ~$10/yil): Vercel → Project → Settings → Domains.
