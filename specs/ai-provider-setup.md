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
