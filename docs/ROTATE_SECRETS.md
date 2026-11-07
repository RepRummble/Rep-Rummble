# Rotating secrets

`server/.env` was committed to git by mistake. It is no longer tracked, but the old values are still in the git history, so
treat every secret that was in it as exposed and replace it. Do these in order, then update Render's Environment settings.

| Secret | Where to replace it | Notes |
|---|---|---|
| `SUPABASE_SERVICE_KEY` | Supabase → Project Settings → API → regenerate the `service_role` key | The most dangerous one: it bypasses all access rules. |
| `SUPABASE_ANON_KEY` | Same page → regenerate the `anon` key (also update the web and mobile builds) | Lower risk, but rotate with the service key. |
| `MONGODB_URI` | Atlas → Database Access → change the database user's password (or create a new user, delete the old) | Update the connection string. |
| `JWT_SECRET` | Generate a new random value (`openssl rand -hex 48`) | Signs old tokens: changing it signs everyone out. |
| `GEMINI_API_KEY` | aistudio.google.com/apikey → create a new key, delete the old | |
| `USDA_API_KEY` | api.data.gov (FoodData Central) → request a new key | |
| `ANTHROPIC_API_KEY`, `OPENAI_API_KEY`, `NUTRITIONIX_*` | Each provider's dashboard → revoke and create new | Delete any you no longer use. |
| `STRIPE_*` | Stripe dashboard → Developers → API keys → roll the secret key; update the webhook signing secret | |

After rotating:

1. Put the new values in Render → your service → Environment, then redeploy.
2. Check `https://reprummble-api.onrender.com/api/health`: `supabaseKeys`, `aiKeys` should read `valid`.
3. Keep your local `server/.env` for development only. It is ignored by git (see `.gitignore`).

## Removing the old values from git history

Rotating makes the old values useless, which is the part that matters. To also scrub them from history (this rewrites
the history of `master` and needs a force push, so everyone who has a copy must re-clone):

```
pip install git-filter-repo
git filter-repo --path server/.env --invert-paths
git push --force origin master
```
