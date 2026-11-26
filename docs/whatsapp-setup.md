# WhatsApp updates: setup

People update their own tasks by messaging your WhatsApp Business number.
The code is in `api/whatsapp-webhook.ts` and `api/_lib/whatsapp/`, the
database rules in `supabase/migrations/20261126130000_whatsapp_updates.sql`.

## 1. Meta (one time)
1. In [Meta for Developers](https://developers.facebook.com/), create an app of type **Business** and add the **WhatsApp** product.
2. Add and verify a phone number for the business. It can't already be a personal WhatsApp account.
3. In **Business Settings → System users**, create a system user, give it the app with `whatsapp_business_messaging` and `whatsapp_business_management`, and generate a **permanent token**.
4. Note the **Phone number ID** (WhatsApp → API setup) and the **App secret** (App settings → Basic).
5. Start **business verification** for higher sending limits. Replies to people's own messages work before verification.

## 2. Vercel environment variables
| Variable | Value |
|---|---|
| `WHATSAPP_TOKEN` | the permanent system-user token |
| `WHATSAPP_PHONE_NUMBER_ID` | the phone number ID |
| `WHATSAPP_APP_SECRET` | the app secret (verifies that messages really come from Meta) |
| `WHATSAPP_VERIFY_TOKEN` | any long random string you choose |
| `VITE_PUBLIC_WHATSAPP_NUMBER` | the business number in digits, e.g. `233201234567` (shows the card in Settings) |

Redeploy after setting them.

## 3. Connect the webhook
In WhatsApp → Configuration → Webhook:
- **Callback URL:** `https://<your-domain>/api/whatsapp-webhook`
- **Verify token:** the same `WHATSAPP_VERIFY_TOKEN`
- Subscribe to the **messages** field.

## 4. Try it
1. In Pulse360, open **Settings → WhatsApp updates → Link my WhatsApp**, then send the `LINK 123456` message it opens.
2. Send `tasks`. You should get your numbered list.
3. Send `1 50% testing`, and check the task in the app.

## Costs and limits
- **Replies:** WhatsApp charges per conversation, and conversations the person starts are the cheapest category. Every update here is person-initiated, and the bot only replies within that 24-hour window.
- **Reminders:** messages Pulse360 starts on its own, such as a 9am reminder, need pre-approved message templates. They're not built yet.
