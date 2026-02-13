<p align="center">
  <img src=".github/banner.svg" alt="qr-code-generator" width="100%">
</p>

<p align="center">
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-blue.svg?style=flat-square" alt="License"></a>
  <img src="https://img.shields.io/badge/node-%3E%3D18-339933.svg?style=flat-square&logo=node.js&logoColor=white" alt="Node.js">
  <img src="https://img.shields.io/badge/platform-Vercel-000000.svg?style=flat-square&logo=vercel&logoColor=white" alt="Vercel">
  <img src="https://img.shields.io/badge/Notion-integrated-000000.svg?style=flat-square&logo=notion&logoColor=white" alt="Notion">
  <a href="https://github.com/hummusonrails/meqr-qr-code-generator-notion-integration/issues"><img src="https://img.shields.io/badge/PRs-welcome-brightgreen.svg?style=flat-square" alt="PRs Welcome"></a>
</p>

<p align="center">
  <strong>CLI tool and web dashboard for generating UTM-tagged QR codes, backed by Notion and the ME-QR API.</strong>
  <br>
  <a href="#quick-start">Quick Start</a> · <a href="#usage">Usage</a> · <a href="https://github.com/hummusonrails/meqr-qr-code-generator-notion-integration/issues">Report a Bug</a>
</p>

## What it does

- **Generate** QR codes for URLs, text, email, WiFi, vCards, phone numbers, maps, PDFs, and app store links
- **Build** UTM-tagged links with source, medium, campaign, content, and event name parameters
- **Integrate** with a Notion UTM Builder database to pull entries and write back generated QR URLs
- **Deploy** a web dashboard on Vercel with session-based authentication and real-time UTM preview
- **Automate** QR generation via Notion webhooks so new UTM entries get codes without manual action
- **Customize** QR output with colors, patterns, logos, sizes, and multiple formats (PNG, SVG, JPG)

## Quick Start

```bash
# Clone the repo
git clone https://github.com/hummusonrails/meqr-qr-code-generator-notion-integration.git
cd meqr-generator

# Install dependencies
npm install

# Copy the example env and fill in your keys
cp .env.example .env

# Generate a QR code for a URL
npm run generate link "https://arbitrum.io"
```

## Stack

| Layer         | Tool                    | Notes                                      |
|:--------------|:------------------------|:-------------------------------------------|
| Runtime       | Node.js (ES Modules)    | v18+                                       |
| CLI framework | Commander               | Subcommands for each QR type               |
| QR engine     | ME-QR API               | Hosted generation with style customization |
| Database      | Notion API              | UTM Builder database as the source of truth|
| Hosting       | Vercel                  | Serverless functions + static dashboard    |
| Auth          | HMAC-SHA256 sessions    | HttpOnly, Secure, SameSite=Strict cookies  |

<details>
<summary><strong>Prerequisites</strong></summary>

- [Node.js](https://nodejs.org/) v18 or later
- A [ME-QR](https://me-qr.com) API key
- A [Notion integration](https://www.notion.so/my-integrations) token with access to your UTM Builder database
- The Notion UTM Builder database ID
- A webhook secret (any strong random string)
- [Vercel CLI](https://vercel.com/docs/cli) (optional, for deployment)

</details>

## Usage

### CLI commands

```bash
# URL QR code
npm run generate link "https://example.com?utm_source=event"

# Plain text
npm run generate text "Hello, Arbitrum!"

# WiFi credentials
npm run generate wifi --ssid MyNetwork --password s3cret --encryption WPA

# Contact card
npm run generate vcard --name "Ben Greenberg" --email ben@example.com

# List UTM entries from Notion
npm run generate utm-list

# Generate QR for a specific UTM entry by index
npm run generate utm-qr --index 1

# Batch generate all UTM entries
npm run generate utm-qr --all --outdir ./qr-codes

# See all commands and options
npm run generate --help
```

### Common options

| Flag           | Description                          | Default |
|:---------------|:-------------------------------------|:--------|
| `-f, --format` | Output format: `png`, `svg`, `jpg`   | `png`   |
| `-o, --output` | Save to file instead of printing URL | —       |
| `-s, --size`   | QR code size in pixels               | `300`   |
| `--pattern`    | Dot pattern style                    | —       |
| `--fg-color`   | Foreground color (hex)               | —       |
| `--bg-color`   | Background color (hex)               | —       |
| `--logo`       | URL of a logo to embed               | —       |

### Web dashboard

Deploy to Vercel for a browser-based interface:

```bash
# Local development
vercel dev

# Production deployment
vercel deploy --prod
```

Log in with your `WEBHOOK_SECRET` to access the dashboard, where you can:

- Build UTM links with a live preview form
- Generate QR codes from manual URLs
- Browse and generate QR codes for Notion UTM entries
- Regenerate existing QR codes

### Webhook automation

Point a Notion automation at your `/api/webhook` endpoint with the `x-webhook-secret` header set to your `WEBHOOK_SECRET`. New or updated UTM entries will automatically get QR codes generated and written back to Notion.

## Project structure

```
qr-code-generator/
├── generate-qr.mjs          # CLI entry point
├── api/
│   ├── auth.js               # Session create / delete
│   ├── generate-qr.js        # QR from Notion page ID
│   ├── generate-qr-url.js    # QR from raw URL
│   ├── utm-entries.js         # List Notion UTM entries
│   └── webhook.js             # Notion webhook handler
├── lib/
│   ├── meqr.js                # ME-QR API client
│   └── session.js             # HMAC-SHA256 session management
├── public/
│   ├── index.html             # Login page
│   ├── dashboard.html         # Main dashboard
│   ├── styles.css             # Arbitrum-themed styles
│   └── assets/                # Logo and background images
├── .env.example               # Environment variable template
└── vercel.json                # Vercel deployment config
```

## Configuration

Create a `.env` file from the template and fill in your values:

```bash
cp .env.example .env
```

| Variable         | Description                                    |
|:-----------------|:-----------------------------------------------|
| `MEQR_API_KEY`   | Your ME-QR API token                           |
| `NOTION_TOKEN`   | Notion integration token                       |
| `UTM_DB_ID`      | Notion UTM Builder database ID                 |
| `WEBHOOK_SECRET` | Shared secret for webhooks and dashboard login |

## Contributing

Contributions are welcome. Open an [issue](https://github.com/hummusonrails/meqr-qr-code-generator-notion-integration/issues) to report bugs or suggest features, and submit a pull request to contribute code.

## License

This project is licensed under the [MIT License](LICENSE).
