# If Like or Feedback don't save

The app uses Firebase Realtime Database. If clicks don't get captured:

1. **Get your Database URL**
   - Go to [Firebase Console](https://console.firebase.google.com) → SweetLies project
   - Click **Realtime Database** in the left menu
   - At the top, copy the URL (e.g. `https://sweetlies-default-rtdb.firebaseio.com` or `https://sweetlies-default-rtdb.asia-southeast1.firebasedatabase.app`)

2. **Add it to Vercel**
   - Go to [Vercel](https://vercel.com) → label-truth project → **Settings** → **Environment Variables**
   - Add: Name = `EXPO_PUBLIC_FIREBASE_DATABASE_URL`, Value = your URL
   - Redeploy the project

3. **Check Firebase Security Rules**
   - Firebase Console → Realtime Database → **Rules** tab
   - Ensure rules allow read/write on `likes/count` and write on `feedback`
