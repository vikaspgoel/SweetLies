# If Like or Feedback don't save

The app uses Firebase Realtime Database. If clicks don't get captured:

1. **Get your Database URL**
   - Go to [Firebase Console](https://console.firebase.google.com) → SweetLies project
   - Click **Realtime Database** in the left menu
   - At the top, copy the full URL (e.g. `https://sweetlies-default-rtdb.firebaseio.com` or `https://sweetlies-default-rtdb.asia-southeast1.firebasedatabase.app`)

2. **Add it to Vercel**
   - Go to [Vercel](https://vercel.com) → label-truth project → **Settings** → **Environment Variables**
   - Click **Add** → Name: `EXPO_PUBLIC_FIREBASE_DATABASE_URL`, Value: paste your URL
   - Redeploy (Deployments tab → three dots on latest → Redeploy)

3. **Check Firebase Security Rules**
   - Firebase Console → Realtime Database → **Rules** tab
   - Use these rules (then click Publish):
   ```
   {
     "rules": {
       "likes": { "count": { ".read": true, ".write": true } },
       "feedback": { ".read": false, ".write": true }
     }
   }
   ```
