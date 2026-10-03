# Frontend

React + TypeScript + Vite client for the ASP.NET Core CQRS API. See the root
[README](../README.md) for setup and development instructions.

## Source organization

- `src/components/feature/<FeatureName>/` contains feature-scoped UI, hooks,
  API calls, types, constants, data, providers, and helpers.
- `src/components/ui/` contains low-level, domain-neutral design primitives
  such as buttons, inputs, and dialogs.
- `src/components/common/` contains reusable, domain-neutral UI components.
- `src/components/global/` contains app-shell components shared across routes.
- `src/api.ts` contains shared API configuration and the current Items example.
