<div align="center">

<img src="Images/nekomo-logo-sakura.jpg" alt="Nekomo logo" width="200">

# 🌐 Nekomo Website

### The open-source source code for the official Nekomo website

[![GitHub Stars](https://img.shields.io/github/stars/Nekomo-App/nekomo-main-web?style=flat-square&logo=github&color=f5c542)](https://github.com/Nekomo-App/Nekomo-Main-Web/stargazers)
[![Discord](https://img.shields.io/badge/Discord-Join-5865F2?style=flat-square&logo=discord&logoColor=white)](https://discord.com/invite/E4Ezmgg7Ka)
[![Telegram](https://img.shields.io/badge/Telegram-Join-26A5E4?style=flat-square&logo=telegram&logoColor=white)](https://t.me/nekomoapp)
[![Website](https://img.shields.io/badge/Live-nekomoapp.netlify.app-ff5c7a?style=flat-square&logo=netlify&logoColor=white)](https://nekomoapp.netlify.app)

<p>
  <a href="https://nekomoapp.netlify.app">🌍 Live Website</a>
  ·
  <a href="https://github.com/Nekomo-App/Nekomo">🐱 Main Project</a>
  ·
  <a href="https://github.com/Nekomo-App/Nekomo/releases">📦 App Releases</a>
  ·
  <a href="https://discord.com/invite/E4Ezmgg7Ka">💬 Discord</a>
  ·
  <a href="https://t.me/nekomoapp">✈️ Telegram</a>
</p>

</div>

> 📱 **Nekomo is an Android & Android TV app** — not available on iOS/Apple devices. This repo is for the *website* only.

---

<details>
<summary><strong>📋 Table of Contents</strong></summary>

- [📖 About](#-about)
- [🔗 Quick Links](#-quick-links)
- [🌐 Socials](#-socials)
- [⚠️ Repository Scope](#-repository-scope)
- [🛠️ Development](#-development)
- [⚖️ DMCA & Legal Disclaimer](#-dmca--legal-disclaimer)

</details>

---

## 📖 About

This repository contains the source code, assets, and configuration files used to build and maintain the official Nekomo website.

The website acts as a central hub for:

- Project information
- App downloads (Mobile & Android TV, Stable & Beta/Debug channels)
- Community links
- Announcements
- Documentation
- Support resources
- Other Nekomo-related content

---

## 🔗 Quick Links

| Resource | Link |
|---|---|
| 🌍 Official Website | [nekomoapp.netlify.app](https://nekomoapp.netlify.app) |
| 🐱 Main Nekomo Repository | [Nekomo-App/Nekomo](https://github.com/Nekomo-App/Nekomo) |
| 📄 App Source Code | [Nekomo-App/neko-source](https://github.com/Nekomo-App/neko-source) |
| ⚖️ Legal pages | [Terms](https://nekomoapp.netlify.app/terms) · [Privacy](https://nekomoapp.netlify.app/privacy) · [DMCA](https://nekomoapp.netlify.app/dmca) · [Support](https://nekomoapp.netlify.app/support) |
| 📦 App Releases | [Latest Releases](https://github.com/Nekomo-App/Nekomo/releases) |
| 👥 Contributors | [Meet the team](https://github.com/Nekomo-App/Nekomo/graphs/contributors) |

---

## 🌐 Socials

| | Link |
|---|---|
| 💬 Discord | [discord.com/invite/E4Ezmgg7Ka](https://discord.com/invite/E4Ezmgg7Ka) |
| ✈️ Telegram | [t.me/nekomoapp](https://t.me/nekomoapp) |
| 🐙 GitHub org | [Nekomo-App](https://github.com/Nekomo-App) |

---

## 🗂️ Site structure

| Path | Purpose |
|---|---|
| `index.html`, `home.html`, `gate.js` | Landing page and the "cherry blossom" bot-check gate |
| `beta.html`, `updates.html`, `uwu-apk.html`, `releases.js` | Downloads and release tracker. `releases.js` reads the GitHub releases of `Nekomo-App/Nekomo` and matches assets named `Nekomo-<phone\|tv>-<release\|beta\|debug>.apk` |
| `terms.html`, `privacy.html`, `dmca.html`, `rules.html`, `support.html` | Legal and support pages (linked from the app's Settings → About) |
| `brand.html`, `contributors.html`, `sitemap.html`, `sitemap.xml`, `robots.txt` | Brand kit, contributors, SEO |
| `pages.css`, `theme.js` | Shared styling. Palette: background `#0c0508`, accent `#e5395f`, deep `#8d2249`, bright `#ff5c7a` |
| `_redirects` | Netlify direct-download shortcuts (`/Nekomo-phone-release.apk` …) that point at the `apks/` folder of [`neko-source`](https://github.com/Nekomo-App/neko-source) |

Deployed with **Netlify** straight from `main`; there is no build step. Keep the `apks/` file names in `_redirects` in sync with the app repository.

> [!NOTE]
> The app links to `/terms`, `/privacy`, `/dmca` and `/support`. Do not rename or remove those paths without updating the app.

---

## ⚠️ Repository Scope

This repository contains **website source code only**.

It does **not** contain:

- App releases
- Anime or manga content
- Media files
- Streaming servers
- Streaming sources
- Download providers
- Third-party hosted content

For app downloads, releases, development information, and project updates, visit the [main Nekomo repository](https://github.com/Nekomo-App/Nekomo).

---

## 🛠️ Development

Changes to the website should be submitted through GitHub using pull requests whenever possible.

Contributions may include:

- Website improvements
- Accessibility updates
- Bug fixes
- Documentation changes
- Design improvements
- Content corrections
- Performance optimizations

Please review the repository guidelines before submitting changes.

---

<details>
<summary><strong>⚖️ DMCA & Legal Disclaimer</strong></summary>

<br>

Nekomo is an open-source project and does **not** host, store, upload, or distribute media content.

Nekomo does not operate, own, maintain, or control streaming servers, content providers, or third-party sources.

Any metadata, images, artwork, descriptions, or other information displayed through Nekomo-related applications may originate from third-party APIs or external services.

Nekomo is **not affiliated with, endorsed by, sponsored by, or officially connected to** AniList, MyAnimeList, Kitsu, TMDb, or any other content provider unless explicitly stated otherwise.

All content, trademarks, copyrights, logos, names, and other intellectual property belong to their respective owners.

Users are responsible for how they use the software and for complying with all applicable laws and regulations in their jurisdiction.

If you believe that content infringes your rights, please contact the relevant source, provider, or website hosting that content directly. Nekomo cannot remove, alter, or manage content it does not host, own, operate, or control.

</details>

---

<div align="center">

## ❤️ Thanks for Visiting

**Nekomo Website Source Code Repository**

<sub>Built and maintained by the Nekomo community.</sub>

</div>
