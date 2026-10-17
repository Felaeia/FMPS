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
    api.ts
    App.tsx
    ui/                             # Low-level design-system primitives
    common/                         # Shared, domain-neutral UI
    global/                         # Application shell and global UI
    feature/
      Scoutline/
        components/
        api/                        # Feature API boundary placeholder
        componentPlaceholder.tsx    # Example feature component
        constant/                   # Feature constants placeholder
        data/                       # Fixtures and static data placeholder
        hooks/useTodos.ts           # Feature state and actions
        lib/                        # Feature helpers placeholder
        provider/                   # Feature context placeholder
        services/todoService.ts     # ToDo API service starter
        types/todo.ts
        util/utilPlaceholder.ts
```

## Run locally

Prerequisites: Node.js with npm and the .NET 8 SDK.

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

## CQRS flow

The Items example keeps HTTP concerns in the controller, sends query and
command requests through MediatR, and puts persistence behind
`IItemRepository`. The current `InMemoryItemRepository` makes the starter
runnable without a database; its data is lost when the API restarts.

Replace the in-memory repository with the persistence approach required by
your project while keeping read and write requests separate. Add project
requirements such as database migrations, authentication, authorization,
logging, and automated tests before production use.

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
