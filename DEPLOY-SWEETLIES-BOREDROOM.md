# SweetLies on sweetlies.boredroom.in – steps for you

The app code is already fine for the custom domain. You only need to do these in your accounts.

---

## Step 1: Add domain in Vercel (you need to log in)

1. Go to **https://vercel.com** and sign in.
2. Open your **label-truth** project (the one that today shows at label-truth.vercel.app).
3. Go to **Settings** → **Domains**.
4. Under "Add", type: **sweetlies.boredroom.in** and add it.
5. Vercel will show something like:
   - **Type:** CNAME  
   - **Name:** sweetlies (or sweetlies.boredroom, depending on provider)  
   - **Value:** `cname.vercel-dns.com`  
   Copy this exactly for Step 2.

---

## Step 2: Add DNS record where boredroom.in is managed

1. Log in to the place where you manage DNS for **boredroom.in** (e.g. GoDaddy, Namecheap, Cloudflare, your registrar).
2. Open DNS settings for **boredroom.in**.
3. Add a **new** record (do not change any existing record for the main site):
   - **Type:** CNAME  
   - **Name/Host:** `sweetlies` (or what Vercel showed in Step 1)  
   - **Target/Value:** `cname.vercel-dns.com` (or the value Vercel gave you)  
   - **TTL:** default (e.g. 3600) is fine.
4. Save.

---

## Step 3: Wait and test

- DNS can take from a few minutes up to 24–48 hours.
- In Vercel → Domains, the domain will show as “Valid” when it’s ready.
- Then open **https://sweetlies.boredroom.in** – the same SweetLies app will load there.

---

## Important

- You did **not** change anything for **boredroom.in** itself or its four links. They keep working as they do now.
- The same app is just also available at sweetlies.boredroom.in.

If any step asks for credentials or shows different names/values, tell me exactly what you see and I’ll adjust these steps.
