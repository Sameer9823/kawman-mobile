# Kawman Field (Android)

Expo / React Native app for field-sales reps. Talks to the existing
`kawman-dashboard` backend (same login, same database).

**Features:** sign in (@kawmanexact.com) · today/upcoming visits · create visit ·
check-in with camera photo + GPS · status updates · visit report ·
business card scanner (AI OCR, edit, save to Contacts) · on-duty live location.

## 1. Apply the server patch first
In the `kawman-dashboard` repo:

    git am kawman-dashboard-mobile-api.patch   # or: git apply
    npm run typecheck && npm test

What it adds: better-auth `bearer` plugin, proxy accepts `Authorization: Bearer`
on `/api/*`, and `/api/mobile/*` routes (me, visits, check-in, status, report,
upload-signature, contacts). No database migration. Deploy to Vercel.

Vercel env that must already exist for the features to work:
`CLOUDINARY_*` (photos) and `OPENAI_API_KEY` or `GOOGLE_GENERATIVE_AI_API_KEY` (card scan).

## 2. Run the app
    npm install
    npx expo install --fix        # aligns versions with your Expo SDK
    echo EXPO_PUBLIC_API_URL=https://kawman-dashboard.vercel.app > .env
    npx expo start                # scan QR with a development build / Expo Go

## 3. Build an APK to install on phones
    npm i -g eas-cli && eas login
    eas build -p android --profile preview      # gives an installable .apk link

## Notes
- Mock-location: the app blocks check-in/live pings when Android reports a mock
  provider, and the server rejects `mocked: true`. This stops casual fake-GPS
  apps; a rooted phone can still hide it. Treat it as a deterrent and keep
  reviewing photo + accuracy on the dashboard Check-ins page.
- Live location runs only while the app is open. Screen-off tracking needs an
  Android foreground service (expo-task-manager + background location
  permission, which Play Store review scrutinises). Say if you want that.
- Sign-in is rate-limited to 5/min per IP by the dashboard; several reps on one
  office Wi-Fi can hit it.
- If sign-in returns an origin/CSRF error, add the app to better-auth
  `trustedOrigins` in `src/lib/auth.ts`.
- TODO on server: `/api/mobile/visits/[id]/report` saves the VisitReport but does
  not yet append to the rep's DailyReport like the web action does (that logic
  is inside a Server Action; extract it to a service and call from both).
