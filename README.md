# Kawman Field (Android)

Expo / React Native app for field-sales reps. Talks to the `kawmanexact-crm`
dashboard backend (same login, same database).

**Features:** sign in (@kawmanexact.com) · today/upcoming visits · create visit ·
check-in with camera photo + GPS · status updates · visit report ·
business card scanner (AI OCR, edit, save to Contacts) · on-duty live location ·
delete visits · follow-up creation from completed visits · schedule revisits ·
daily report submission · company dropdown selector · full profile view + edit.

## 1. Run the app
    npm install
    npx expo install --fix        # aligns versions with your Expo SDK
    echo EXPO_PUBLIC_API_URL=https://kawmanexact-crm.vercel.app > .env
    npx expo start                # scan QR with a development build / Expo Go

## 2. Build an APK to install on phones
    npm i -g eas-cli && eas login
    eas build -p android --profile preview      # gives an installable .apk link

## Testing
- Follow-ups: tap any follow-up in the Follow-ups tab to open a status picker with
  PENDING, COMPLETED, OVERDUE, and CANCELLED options. Status is updated manually — it
  does not auto-complete when tapped.
- Check-in (and on-duty live-location pings) are rejected on the Android emulator
surfaces **"Mock location detected"** and will not record the visit — there is no
bypass. The server additionally rejects any request sent with `mocked: true`.

To test check-in end-to-end, use a **real Android phone** with
`Settings > Developer options > Select mock location app` set to **none**.

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
