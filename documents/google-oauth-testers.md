# Google Calendar / Meet — “app has not completed verification”

## What this means

Your Google Cloud OAuth app is in **Testing**. Only emails listed as **Test users** can connect. This is normal until you publish the app (or keep it in testing with approved testers).

## Fix (keep Testing — recommended while building)

1. Open [Google Cloud Console](https://console.cloud.google.com/)
2. Select the project for Slotwise
3. **APIs & Services → OAuth consent screen**
4. Under **Test users** → **Add users**
5. Add every Google account that should connect Calendar/Meet (e.g. your Gmail / Workspace email)
6. Save → try **Dashboard → Integrations → Google Calendar → Connect** again

## Optional later: publish for anyone

1. Same OAuth consent screen → **Publish app**
2. Google may require verification for sensitive scopes (`calendar.events`)
3. Until verified, external users can hit the same “not completed verification” warning

## Scopes Slotwise uses

- `https://www.googleapis.com/auth/calendar.events`
- `https://www.googleapis.com/auth/userinfo.email`

## Redirect URIs (must match exactly)

```
https://slotwise.hindaralabs.com/api/site/integrations/oauth/google/callback
https://slotwise.hindaralabs.com/api/site/integrations/oauth/meet/callback
```
