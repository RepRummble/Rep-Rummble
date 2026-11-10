# Connecting devices

Reprummble supports five devices. Two read from the phone, three sign in to the maker's service.

| Device | How it connects | Needs from you |
| --- | --- | --- |
| Apple Watch | Apple Health on the iPhone (HealthKit) | Nothing. Works in the iPhone build. |
| Samsung Galaxy Watch | Samsung Health → Android Health Connect | An Android build (see below). |
| WHOOP | OAuth sign-in | A WHOOP developer app |
| Oura Ring | OAuth sign-in | An Oura developer app |
| Fitbit | Google sign-in (Google Health API) | A Google Cloud OAuth client |

Until a service's keys are set, the app lists it as "not switched on yet". It never shows made-up data.

## Server settings (Render)

```
DEVICE_TOKEN_KEY=<openssl rand -base64 32>   # locks stored sign-ins (AES-256-GCM). Keep it safe: if lost, everyone signs in again.
PUBLIC_API_URL=https://<your API host>        # no trailing slash
WHOOP_CLIENT_ID / WHOOP_CLIENT_SECRET
OURA_CLIENT_ID / OURA_CLIENT_SECRET
GOOGLE_HEALTH_CLIENT_ID / GOOGLE_HEALTH_CLIENT_SECRET
```

Register **exactly** these return addresses with each service (replace the host):

```
https://<API host>/api/devices/callback/whoop
https://<API host>/api/devices/callback/oura
https://<API host>/api/devices/callback/fitbit
```

## WHOOP — developer.whoop.com
Create an app in the WHOOP Developer Dashboard. Scopes used: `offline read:recovery read:cycles read:sleep read:profile`. Add the whoop return address above. Create the app at developer-dashboard.whoop.com/apps/create (you can have up to 5). Check the dashboard for any limit on how many members a new app can have before WHOOP approves it.

## Oura — cloud.ouraring.com/oauth/applications
Create an application. Scope used: `daily`. Add the oura return address. Check Oura's dashboard for any limit on users while a new app is unapproved.

## Fitbit — through the Google Health API
Google switched off the old Fitbit Web API on 2 November 2026. Fitbit and Pixel Watch data now comes from the Google Health API:

1. In Google Cloud, create a project and enable the **Google Health API**.
2. Create an OAuth client of type **Web application**. Add the fitbit return address above.
3. On the consent screen add the scopes `googlehealth.activity_and_fitness.readonly`, `googlehealth.sleep.readonly`, `googlehealth.health_metrics_and_measurements.readonly`.
4. While the app is in **Testing**, only listed test users can sign in and their sign-in lasts 7 days. Publish the app for normal use.
5. Google caps unverified apps at **100 users**. More than that needs Google's third-party security review.
6. Each person must have linked their Google account to Google Health in the Fitbit / Google Health app first. If not, the app tells them so.

## Galaxy Watch — Android Health Connect
Samsung has no public cloud API for the watch. Its data reaches Health Connect through Samsung Health, and Reprummble reads it from there. This needs a new Android build (`eas build --platform android`) because it adds a native module, and the Play Console Health Connect permission declaration before store release. The phone must have Health Connect (built in on Android 14+) and Samsung Health syncing to it.

## What is stored, and how a person removes it
- Sign-in tokens are encrypted at rest and never sent to the app.
- Readings are stored per day, per device, and only what the device reported.
- **Remove** in the app tells the service to revoke access (where the service has an endpoint for it), deletes the stored sign-in and deletes that device's readings. Deleting the account does the same for every device.
- When two devices report the same number for a day, one is shown (never added together), and the screen says which. Priority: steps and active calories from watches first; sleep, resting heart rate and HRV from rings and straps first.

## Not yet verified against real accounts
Everything above is covered by automated tests with the services simulated. The first connection with a real WHOOP, Oura, Google/Fitbit and Galaxy Watch is the real test. The Google Health API's resting heart rate and HRV queries are the least certain: if Google rejects them for a person, those two readings are left out (steps and sleep are unaffected).
