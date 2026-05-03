# Slack channel — setup

Step-by-step to get the Brain answering inside a Slack workspace.

## 1. Create a Slack workspace (if you don't have one)

https://slack.com/get-started — free, no credit card. For the YC demo, name
it `companybrain-demo` or `bind-bank-demo`.

## 2. Create a Slack App

1. Go to https://api.slack.com/apps and click **Create New App** → **From scratch**.
2. Name: `Company Brain`
3. Workspace: pick the one you just created.

## 3. Bot scopes

In your new app's settings:

- **OAuth & Permissions** → **Scopes** → **Bot Token Scopes**, add:
  - `app_mentions:read` — see when users `@mention` the bot in channels
  - `chat:write` — post answers
  - `im:history` — read DMs the bot receives
  - `im:read` — see direct message channels
  - `im:write` — open DM channels with users (optional, for proactive)

## 4. Event subscriptions

- **Event Subscriptions** → toggle **Enable Events** = ON.
- **Request URL**: `https://<your-render-host>.onrender.com/channels/slack/events`
  - Slack will hit it with a `url_verification` challenge — our handler echoes
    the challenge automatically. Should turn green within 3 seconds.
- **Subscribe to bot events**, add:
  - `app_mention` — `@CompanyBrain how do I…` in a channel
  - `message.im` — direct messages to the bot

Save Changes.

## 5. Install to workspace

- **Install App** → **Install to Workspace** → Allow.
- Copy the **Bot User OAuth Token** (starts with `xoxb-`).
- **Basic Information** → copy the **Signing Secret**.

## 6. Set env vars on the backend (Render)

In your Render service → Environment:

```
SLACK_BOT_TOKEN=xoxb-…………
SLACK_SIGNING_SECRET=…………
```

Restart the service. The webhook endpoint becomes live.

## 7. Test

In Slack:

- DM the bot:
  > Who reviews vendor contracts?
- Or @-mention in a channel:
  > @Company Brain who approves credit exceptions?

The bot answers with a Block Kit message: header chip, summary, person card
(name, role, email, phone), procedure, SLA, citations, and follow-up buttons.

## What the user sees

```
💡 Brain
Vendor contracts are reviewed by Carlos Méndez (Legal).
Send the document via email with amount and counterparty.

Carlos Méndez
Legal · Riesgos
✉ carlos@bind.com.ar
☎ 1001

Cómo: Send the document via email with amount and counterparty.
⏳ SLA · 24 hs

Citas
> "el contacto para revisar contratos es Carlos Méndez" — Tomás Ledesma

[ ¿Quién aprueba > USD 50K? ]  [ ¿Plazo de revisión? ]
```

## Limitations / next steps (V1.5)

- Org mapping: V1 uses `default_org_id` from settings. V1.5 should map
  `team_id` from the Slack payload to a `organization_id` in Supabase.
- Follow-up button clicks aren't wired yet — they post to `interactivity`
  endpoint which we don't expose. To enable, add Interactivity request URL
  pointing at `/channels/slack/interactivity` (TODO).
- `chat:write.public` scope would let the bot post in channels it isn't a
  member of — useful for proactive notifications.
