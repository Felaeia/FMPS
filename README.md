# React + .NET CQRS Template

A reusable starter for full-stack projects using React, TypeScript, and
ASP.NET Core with CQRS and MediatR. The repository contains a runnable Items
example and a separate ToDo frontend feature scaffold that you can adapt to
your project.

## Technology

- **Frontend:** React, TypeScript, Vite, Tailwind CSS
- **Backend:** ASP.NET Core 8 Web API, MediatR
- **CQRS example:** item queries and a create-item command

## Repository layout

```text
frontend/
  src/
    api.ts
    App.tsx
    components/
      ui/                             # Low-level design-system primitives
      common/                         # Shared, domain-neutral UI
      global/                         # Application shell and global UI
      feature/
        ToDo/
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
backend/
  Controllers/ItemsController.cs
  Application/Items/
    Commands/CreateItemCommand.cs
    Queries/GetItemsQuery.cs
    Queries/GetItemByIdQuery.cs
    IItemRepository.cs
  Domain/Items/Item.cs
  Infrastructure/Items/InMemoryItemRepository.cs
```

Feature-specific code belongs under `components/feature/<FeatureName>`.
`ui` is for low-level design primitives such as buttons, inputs, and dialogs.
`common` is for higher-level reusable components composed from those
primitives; `global` is for app-wide shell components such as navigation and
global status UI.

The ToDo frontend files are a scaffold and are **not wired into the current
screen**. They expect a future `GET /api/todos` and `POST /api/todos` API. The
working end-to-end example is Items:

- `GET /api/items` — query all items
- `GET /api/items/{id}` — query one item
- `POST /api/items` — create an item

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

## Create a project from this template

1. Use GitHub's **Use this template** action or clone the repository into your
   own project repository.
2. Rename the repository, API assembly, namespaces, and sample features to
   match your domain.
3. Configure API URLs, CORS origins, and environment-specific settings.
4. Implement the domain, database, and project-specific security and tests.

Keep local `.env` files, credentials, and production connection strings out of
source control. Use ASP.NET Core user secrets during development and a secure
deployment secret store for deployed environments.
