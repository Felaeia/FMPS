## Technology

- **Frontend:** React, TypeScript, Vite, Tailwind CSS
- **Backend:** ASP.NET Core 8 Web API, MediatR
- **Database:** Supabase
- **Agent for Automation:** Fara-7B
- **Automated Scraping Agent:** Playwright

## Repository layout

```text
backend/
  Controllers/ItemsController.cs
  Application/Items/
    Commands/CreateItemCommand.cs
    Queries/GetItemsQuery.cs
    Queries/GetItemByIdQuery.cs
    IItemRepository.cs
  Domain/Items/Item.cs
  Infrastructure/Items/InMemoryItemRepository.cs

frontend/
  src/
    ui/                             # Low-level design-system primitives
    common/                         # Shared, domain-neutral UI
    global/                         # Application shell and global UI
    feature/
      Scoutline/
        components/
        api/                        # Feature API boundary placeholder
        componentPlaceholder.tsx    # Example feature component
        constant/                   # Feature constants placeholder
        types/                      # Typescript types and shared interfaces
        util/                       # Pure utility functions
    api.ts
    App.css
    App.tsx
    index.css
    main.tsx
```

## Run locally

Prerequisites: 
- Node.js with npm and the .NET 8 SDK.
- Install WSL2 (For Windows)

### 1. Start the API

In the repository root:

```powershell
dotnet dev-certs https --trust
dotnet run --project backend\Template.Api.csproj --launch-profile https
```

The API uses `https://localhost:7022` for HTTPS and Swagger is at
`https://localhost:7022/swagger`.

### 2. Start the frontend

In another terminal, from the repository root:

```powershell
Copy-Item frontend\.env.example frontend\.env
Set-Location frontend
npm ci
npm run dev
```

Open the Vite URL shown in the terminal, usually `http://localhost:5173`.
Change `VITE_API_BASE_URL` in `frontend\.env` if the API URL is different.

The API allows `http://localhost:5173` by default. Configure other frontend
origins with standard ASP.NET Core configuration, for example:

```powershell
$env:Cors__AllowedOrigins__0 = "https://your-frontend.example"
```

### 3. Clone the `Fara` Agent and Run
## 1. Clone repository
git clone https://github.com/microsoft/fara.git
cd fara

## 2. Setup environment in WSL
python3 -m venv .venv 
source .venv/bin/activate
pip install -e .
pip install vllm
playwright install


## Common commands

Run frontend commands from `frontend`:

```powershell
npm run lint
npm run build
```

Run the backend build from the repository root:

```powershell
dotnet build backend\Template.Api.csproj
```
