# Economical AI support drafting

Use Gemini 2.5 Flash-Lite for an economical hosted option with a provider free tier where available. Existing OpenAI configurations remain compatible when AI_PROVIDER is absent or set to openai.

In Vercel Project Settings > Environment Variables, set these for Production and redeploy:

```env
AI_ENABLED=true
AI_PROVIDER=gemini
GEMINI_API_KEY=<private key from Google AI Studio>
GEMINI_MODEL=gemini-2.5-flash-lite
AI_DAILY_CALL_LIMIT=10
AI_ALLOW_CUSTOMER_TEXT=false
```

Create the key at https://aistudio.google.com/apikey. Keep it out of source control and browser code. No database migration is needed for this provider change.

The free tier has account/model quotas and may use submitted content to improve Google products. Customer messages are withheld by default; enabling AI_ALLOW_CUSTOMER_TEXT sends redacted text but may still include names or other personal information. Review the data policy before enabling it. Pricing and availability: https://ai.google.dev/gemini-api/docs/pricing

Gemini calls use structured JSON output, no tools, a 20-second timeout and a shared daily API call cap. A missing key, exhausted budget, failed request or invalid/refused response returns the local acknowledgement draft without calling a paid alternative. All drafts still require staff review. The application cap counts requests, not money: a billing-enabled Google project may charge according to its pricing. Use a free-tier project if zero API spend is required.

This change affects support drafts only. It does not replace the queue worker or change Vercel Hobby's daily cron schedule.

## Optional Gemini / Groq availability failover

Create a Groq key at https://console.groq.com/keys and configure:

```env
AI_PROVIDER_ORDER=gemini,groq
GROQ_API_KEY=<private Groq key>
GROQ_MODEL=openai/gpt-oss-20b
GEMINI_DAILY_CALL_LIMIT=10
GROQ_DAILY_CALL_LIMIT=10
AI_DAILY_CALL_LIMIT=20
```

AI_PROVIDER_ORDER overrides AI_PROVIDER. Reverse it to groq,gemini to prefer Groq. Only these explicitly named providers are supported in this chain; OpenAI is not added implicitly. Missing keys are skipped. The shared daily cap counts attempts across both providers; each provider also has its own cap. Transient server/network failures or quota exhaustion try the next provider, with a database-backed cooldown to avoid repeatedly calling an unavailable provider. Content refusals, malformed outputs, authentication or request errors stop with a local draft for staff review. Each request has an eight-second timeout. Provider selection and failure reason codes are audited without storing keys or customer text in those entries.

Both services have account-specific free quotas. The application does not guarantee zero billing on paid accounts, and failover is not a quality benchmark: compare Arabic draft quality on synthetic examples before sending real customer text. Groq structured-output support and quotas: https://console.groq.com/docs/structured-outputs and https://console.groq.com/docs/rate-limits
