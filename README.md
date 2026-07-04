[![es](https://img.shields.io/badge/lang-es-yellow.svg)](https://github.com/ItzAle/f1-app/blob/main/README-es.md)

# F1 App Two

A responsive Formula 1 companion app built with **React 18**, **TypeScript**, and **Vite 8**.

**Live demo:** [formula1app-ale.vercel.app](https://formula1app-ale.vercel.app/)

## Overview

F1 App Two brings together the parts of the F1 season fans check most often in one place: championship standings, the full race calendar, session results, driver and constructor profiles, latest headlines, and head-to-head comparison views.

The current app supports **multiple seasons** through a shared URL search parameter and uses **2024** as the default season. In practice, the app ships with season selection support for **2020-2026**, and the selected season is preserved as you navigate.

## What you can do

- Browse **drivers' championship** standings
- Browse **constructors' championship** standings
- Switch between supported seasons with the built-in **season selector**
- See the **season schedule** and countdown to the next race
- Review the **latest race results** directly from the landing page
- Open **driver profiles** with stats, biography, imagery, and team context
- Open **constructor profiles** with team details and driver information
- View **race**, **qualifying**, and **sprint** results per round
- Compare **two drivers** side by side, including points evolution and shareable URLs
- Compare **two constructors** side by side, including team stats and points progression
- Read the latest **Formula1.com** headlines via RSS
- Use a responsive **light/dark themed** interface with loading, empty, error, and 404 states

## Stack and architecture

This project is a client-side React application powered by:

- [React 18](https://react.dev/) for the UI
- [TypeScript](https://www.typescriptlang.org/) with strict compiler settings
- [Vite 8](https://vitejs.dev/) for development and production builds
- [TanStack Router](https://tanstack.com/router) for file-free route definitions and typed navigation
- [TanStack Query](https://tanstack.com/query) for API fetching, caching, and async state
- [Axios](https://axios-http.com/) for HTTP requests to the F1 data API
- [Material UI](https://mui.com/) and [Tailwind CSS v4](https://tailwindcss.com/) for the interface layer
- [Vitest](https://vitest.dev/) and [Testing Library](https://testing-library.com/) for unit and component tests
- [ESLint](https://eslint.org/), [Prettier](https://prettier.io/), [Husky](https://typicode.github.io/husky/), and [lint-staged](https://github.com/lint-staged/lint-staged) for code quality

Typed query hooks live under `src/hooks/queries/`, shared API infrastructure lives in `src/services/api/`, and the route tree is defined in `src/app/router.tsx`. Development-only React Query and TanStack Router devtools are mounted automatically when running locally.

## Data sources

- **Core F1 data:** [Jolpica F1 API](https://github.com/jolpica/jolpica-f1) at `https://api.jolpi.ca/ergast/f1`
- **News headlines:** Formula1.com RSS feed, fetched through `allorigins.win` to avoid browser CORS issues
- **Local curated assets:** driver bios, portraits, helmets, team logos, and related F1 mapping data in `src/domain/f1/`

## Getting started

### Prerequisites

- [Node.js](https://nodejs.org/) **20.19+** or **22.12+**
- `npm`

No custom environment variables are required for the default local setup.

### Installation

```bash
git clone https://github.com/ItzAle/f1-app.git
cd f1-app
npm install
```

After installation, the `prepare` script configures Husky hooks automatically. On commit, `lint-staged` runs ESLint and Prettier against staged files.

### Run locally

```bash
npm run dev
```

The Vite development server runs at [http://localhost:3000](http://localhost:3000) and opens the browser automatically.

## Available scripts

| Script                 | Description                                        |
| ---------------------- | -------------------------------------------------- |
| `npm start`            | Alias for the Vite dev server.                     |
| `npm run dev`          | Starts the development server with HMR.            |
| `npm run build`        | Builds the production bundle into `build/`.        |
| `npm run preview`      | Serves the production build locally.               |
| `npm run typecheck`    | Runs TypeScript in `--noEmit` mode.                |
| `npm test`             | Starts the Vitest test runner.                     |
| `npm run lint`         | Runs ESLint with the flat config.                  |
| `npm run lint:fix`     | Runs ESLint and applies auto-fixes where possible. |
| `npm run format`       | Formats the repository with Prettier.              |
| `npm run format:check` | Verifies formatting without writing changes.       |

Useful one-off commands:

```bash
npm test -- --run
npm test -- --coverage
```

## Routing

The app uses **TanStack Router**, not React Router. Most pages preserve the selected season through the `?season=` search parameter.

| Path                      | View                                                                 |
| ------------------------- | -------------------------------------------------------------------- |
| `/`                       | Landing page with race countdown, last race results, and latest news |
| `/driverstandings`        | Drivers' championship standings                                      |
| `/driver-comparison`      | Driver head-to-head comparison                                       |
| `/constructorstandings`   | Constructors' championship standings                                 |
| `/constructor-comparison` | Constructor head-to-head comparison                                  |
| `/schedule`               | Full season calendar                                                 |
| `/driver/:id`             | Driver profile                                                       |
| `/constructor/:id`        | Constructor profile                                                  |
| `/race`                   | Race results index                                                   |
| `/race/:race`             | Race results for a round                                             |
| `/qualifying`             | Qualifying index                                                     |
| `/qualifying/:round`      | Qualifying results for a round                                       |
| `/sprint/:round`          | Sprint results for a round                                           |
| `*`                       | Custom 404 page with quick navigation links                          |

Example URLs:

- `http://localhost:3000/driverstandings?season=2025`
- `http://localhost:3000/driver-comparison?season=2024&driver1=max_verstappen&driver2=lando_norris`
- `http://localhost:3000/constructor-comparison?season=2026&constructor1=ferrari&constructor2=mclaren`

## Path aliases

The same aliases are configured in both `vite.config.ts` and `tsconfig.json`:

| Alias           | Resolves to        |
| --------------- | ------------------ |
| `@/*`           | `src/*`            |
| `@app/*`        | `src/app/*`        |
| `@assets/*`     | `src/assets/*`     |
| `@components/*` | `src/components/*` |
| `@domain/*`     | `src/domain/*`     |
| `@hooks/*`      | `src/hooks/*`      |
| `@pages/*`      | `src/pages/*`      |
| `@services/*`   | `src/services/*`   |
| `@styles/*`     | `src/styles/*`     |

## Project structure

```text
.
├── public/              # Static files copied as-is
├── src/
│   ├── app/             # App shell, router, QueryClient
│   ├── assets/          # Fonts, images, logos
│   ├── components/      # Reusable UI building blocks
│   ├── domain/f1/       # Season helpers, bios, images, team metadata
│   ├── hooks/           # Custom hooks and query hooks
│   ├── pages/           # Routed pages
│   ├── services/api/    # Axios client, API wrappers, query keys, tests
│   ├── styles/          # Global styles and design tokens
│   └── index.tsx        # React entry point
├── build/               # Production output directory
├── eslint.config.mjs    # ESLint flat config
├── tsconfig.json        # TypeScript config
├── vite.config.ts       # Vite + Vitest + Tailwind config
└── package.json
```

## Testing and quality checks

Tests live alongside the code they cover and run in a `jsdom` environment with Vitest and Testing Library.

```bash
npm test -- --run
npm run lint
npm run typecheck
npm run format:check
```

Coverage is available through `@vitest/coverage-v8`:

```bash
npm test -- --coverage
```

## Design

The mobile-first interface was designed in Figma. You can view the design file [here](https://www.figma.com/design/ODMeDrwZXAJ3uYMqaNU37N/Untitled?node-id=45-1226&t=FxrkAr6LKEDzR72J-1).

## Technologies

![TypeScript](https://img.shields.io/badge/typescript-%23007ACC.svg?style=for-the-badge&logo=typescript&logoColor=white)
![React](https://img.shields.io/badge/react-%2320232a.svg?style=for-the-badge&logo=react&logoColor=%2361DAFB)
![Vite](https://img.shields.io/badge/vite-%23646CFF.svg?style=for-the-badge&logo=vite&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/tailwindcss-%2338B2AC.svg?style=for-the-badge&logo=tailwind-css&logoColor=white)
![MUI](https://img.shields.io/badge/MUI-%230081CB.svg?style=for-the-badge&logo=mui&logoColor=white)
![TanStack Query](https://img.shields.io/badge/TanStack%20Query-FF4154?style=for-the-badge&logo=reactquery&logoColor=white)
![TanStack Router](https://img.shields.io/badge/TanStack%20Router-111827?style=for-the-badge&logoColor=white)
![Axios](https://img.shields.io/badge/axios-671ddf?style=for-the-badge&logo=axios&logoColor=white)
![ESLint](https://img.shields.io/badge/ESLint-4B32C3?style=for-the-badge&logo=eslint&logoColor=white)
![Prettier](https://img.shields.io/badge/Prettier-F7B93E?style=for-the-badge&logo=prettier&logoColor=black)
![Vitest](https://img.shields.io/badge/Vitest-6E9F18?style=for-the-badge&logo=vitest&logoColor=white)
![Vercel](https://img.shields.io/badge/vercel-%23000000.svg?style=for-the-badge&logo=vercel&logoColor=white)

## Security

If you discover a security issue, please follow the disclosure process in [SECURITY.md](./SECURITY.md).

## License

This project is licensed under the terms of the [LICENSE](./LICENSE) file.

## Notice

This website is unofficial and is not associated in any way with the Formula 1 companies. F1, FORMULA ONE, FORMULA 1, FIA FORMULA ONE WORLD CHAMPIONSHIP, GRAND PRIX, and related marks are trade marks of Formula One Licensing B.V.
