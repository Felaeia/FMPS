# FPMS

FPMS is a web application for monitoring Facebook pages and reviewing their
public posts in a feed. It consists of a React frontend, an ASP.NET Core API,
and a Playwright scraper. A Fara-compatible model service is used to configure
the scraper when adding a monitored page; it does not generate scraper code.

> **Status:** This project is under active development. The backend currently
> stores monitored pages and collected posts in a local JSON file. It is not a
> production multi-user database.

## Features

- Add and manage monitored Facebook pages.
- Review collected post text, image thumbnails, and video/reel links.
- Schedule recurring scrapes at supported intervals.
- Preview a scrape before approving a page.
- Keep scraper behavior constrained to the repository's reviewed
  `frontend/agent/scripts/scrape-facebook.mjs` template.

## Architecture

```text
Browser
  React / TypeScript / Vite
      | HTTP (JSON)
      v
ASP.NET Core 8 API
  Controllers -> Scoutline services and JSON state
      |                         |
      | OpenAI-compatible       | launches approved script
      | chat completions        v
      v                    Node.js + Playwright
Fara-compatible model          Facebook page
```

- **Frontend** (`frontend/src/`): React application with React Router, feature
  components, shared UI, and API clients.
- **API** (`backend/`): ASP.NET Core 8 controllers handle monitored pages,
  feed requests, script previews, and approvals.
- **State**: `backend/App_Data/scoutline-state.json` stores page and post
  state. This file is local runtime data and is ignored by Git. Back it up if
  you need to preserve a local installation; do not rely on it for concurrent
  or multi-instance deployments.
- **Scraper** (`frontend/agent/scripts/scrape-facebook.mjs`): Node.js and
  Playwright inspect Facebook pages and return post text, media metadata, and
  links. Facebook video streams are not downloaded; video entries use
  thumbnails where available and link to the original post.
- **Model service**: The API asks a Fara-compatible chat-completions endpoint
  for the requested page URL and post limit. The API applies those values to
  its fixed scraper template and validates the approved script before
  execution.

### Main API routes

| Method | Route | Purpose |
| --- | --- | --- |
| `GET` | `/api/scoutline/monitoring/pages` | List monitored pages |
| `POST` | `/api/scoutline/monitoring/pages` | Approve and add a page |
| `POST` | `/api/scoutline/monitoring/pages/{id}/preview` | Publish an initial preview |
| `PATCH` | `/api/scoutline/monitoring/pages/{id}` | Update page settings |
| `DELETE` | `/api/scoutline/monitoring/pages/{id}` | Remove a page |
| `GET` | `/api/scoutline/monitoring/feed` | Read collected posts |
| `POST` | `/api/scoutline/scripts/generate` | Prepare an approved script draft |
| `POST` | `/api/scoutline/scripts/preview` | Run a draft and return its preview |
| `DELETE` | `/api/scoutline/scripts/drafts/{draftId}` | Discard a draft |

In Development, Swagger is available at `https://localhost:7022/swagger`.

## Requirements

- Git
- Node.js and npm (use a Node.js release supported by the installed Vite
  version)
- .NET 8 SDK
- Chromium dependencies required by Playwright on your operating system
- A running Fara-compatible chat-completions server to use the add-page
  workflow (default API URL: `http://localhost:5000`)

The application can be built and the API can run without starting the model
server, but generating scraper settings for a new page requires it.

## Run locally

### 1. Get the source and install frontend dependencies

```sh
git clone https://github.com/Felaeia/FMPS.git
cd FMPS
npm --prefix frontend ci
npx --prefix frontend playwright install chromium
```

If your operating system requires additional Playwright browser libraries,
follow the [Playwright browser installation guide](https://playwright.dev/docs/browsers).

### 2. Configure and start the API

The checked-in Development configuration allows the default Vite origin,
`http://localhost:5173`. To allow another origin, set
`Cors__AllowedOrigins__0` in the API process environment.

For PowerShell:

```powershell
$env:Cors__AllowedOrigins__0 = "http://localhost:5173"
dotnet dev-certs https --trust
dotnet run --project backend\FPMS.csproj --launch-profile https
```

For a POSIX shell:

```sh
export Cors__AllowedOrigins__0="http://localhost:5173"
dotnet dev-certs https --trust
dotnet run --project backend/FPMS.csproj --launch-profile https
```

The API listens on `https://localhost:7022` and `http://localhost:5141` with
the supplied launch profile. Swagger is available at
`https://localhost:7022/swagger`.

### 3. Configure and start the frontend

In another terminal, copy the example environment file and start Vite:

PowerShell:

```powershell
Copy-Item frontend\.env.example frontend\.env
Set-Location frontend
npm run dev
```

POSIX shell:

```sh
cp frontend/.env.example frontend/.env
cd frontend
npm run dev
```

Open the URL printed by Vite (usually `http://localhost:5173`). Set
`VITE_API_BASE_URL` in `frontend/.env` if the API is running at a different
URL. Restart Vite after changing environment variables.

### 4. Start the model service (for adding pages)

Run a Fara-compatible chat-completions server and make sure the API can reach
it. The default is `http://localhost:5000`. To use a different base URL, set
`Fara__BaseUrl` for the API process, for example:

```powershell
$env:Fara__BaseUrl = "http://localhost:5000"
```

Consult the [Microsoft Fara project](https://github.com/microsoft/fara) and
your chosen model server's documentation for model setup. FPMS expects an
OpenAI-compatible `/v1/chat/completions` endpoint. Model hosting has its own
hardware and software requirements and is not installed by the frontend
package manager.

## Configuration

| Setting | Default | Description |
| --- | --- | --- |
| `VITE_API_BASE_URL` | `https://localhost:7022` | API URL used by the frontend |
| `Cors__AllowedOrigins__0` | `http://localhost:5173` | An allowed browser origin; add indexed entries for additional origins |
| `Fara__BaseUrl` | `http://localhost:5000` | Base URL of the Fara-compatible model server |
| `Scraper__NodeExecutable` | `node` | Node executable used by the backend to launch the scraper |

ASP.NET Core supports environment-variable configuration using double
underscores (`__`) in place of configuration key separators.

## Packages and commands

Frontend dependencies are declared in `frontend/package.json` and locked in
`frontend/package-lock.json`. Install them with `npm ci` from `frontend/` (or
`npm --prefix frontend ci` from the repository root). This installs React,
React Router, Tailwind CSS, Vite, TypeScript, Playwright, and the project's
other declared packages.

The backend uses the .NET 8 shared framework and restores the package
references in `backend/FPMS.csproj` automatically when building:

```sh
dotnet restore backend/FPMS.csproj
dotnet build backend/FPMS.csproj
```

Common frontend checks (run from `frontend/`):

```sh
npm run lint
npm run build
```

## Contributing

Contributions are welcome. For substantial changes, open an issue or discussion
first to agree on scope and approach.

1. Fork the repository and create a focused branch from the current default
   branch.
2. Make a small, well-scoped change. Keep scraper behavior in the reviewed
   template and avoid adding generated scraper code or local runtime data.
3. Run `npm run lint` and `npm run build` from `frontend/`, and
   `dotnet build backend/FPMS.csproj` from the repository root. Add or update
   tests when test coverage is introduced for the affected behavior.
4. Open a pull request describing the problem, the change, and the checks you
   ran. Include screenshots for visible UI changes where useful.

Please do not commit credentials, `.env` files, browser session state, generated
scripts, or data from `backend/App_Data/`. Report security issues privately to
the maintainers rather than in a public issue.

### Responsible scraping

Only monitor pages and content you are authorized to access. Follow
Facebook/Meta's terms, applicable laws, and site access controls. This project
does not promise uninterrupted scraping; Facebook may change its pages or
restrict access. Do not use the scraper to bypass authentication or technical
restrictions.

## License

No `LICENSE` file is currently present in this repository. The maintainers
should add a license before reuse or redistribution terms can be established.
