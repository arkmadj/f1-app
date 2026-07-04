[![eng](https://img.shields.io/badge/lang-eng-yellow.svg)](https://github.com/ItzAle/f1-app/blob/main/README.md)

# F1 App hecha con React

# Puedes ver la web [aquí](https://formula1app-ale.vercel.app/).

Una aplicación web complementaria de Fórmula 1 construida con **React 18** y **Vite**. Muestra la clasificación de pilotos y constructores, el calendario de la temporada, resultados de carreras / clasificación / sprint y perfiles individuales de pilotos y constructores para la **temporada 2024 de F1**.

> ⚠️ Actualmente esta app está enfocada **solo en la temporada 2024**. Ya se está desarrollando una nueva versión para futuras temporadas, y el banner dentro de la app lo indica.

# ❓ ¿Qué es esto?

Con esta app puedes:

- 🏆 Consultar la **clasificación del campeonato de pilotos**
- 🏎️ Consultar la **clasificación del campeonato de constructores**
- 📅 Ver el **calendario completo de la temporada** con cuenta atrás hasta la próxima carrera
- 🏁 Ver los **resultados de la última carrera** en la página principal
- 🧑‍🚀 Abrir un **perfil de piloto** con biografía, estadísticas, casco e información del equipo
- 🏭 Abrir un **perfil de constructor** con información del equipo, pilotos y coche
- 🏎️ Ver **resultados de carrera**, **resultados de clasificación** y **resultados de sprint** por ronda
- 📰 Leer los últimos titulares mediante un feed de noticias **RSS de F1**
- 🌗 Alternar entre **tema claro/oscuro** y usar un diseño responsive **mobile-first**

# ❓ ¿Cómo funciona?

La aplicación está construida con [React 18](https://react.dev) sobre [Vite 8](https://vitejs.dev/) y está completamente migrada a [TypeScript](https://www.typescriptlang.org/) con un `tsconfig.json` estricto. Consume la API [Jolpica F1](https://github.com/jolpica/jolpica-f1) (la sucesora drop-in de la API Ergast, ya descontinuada) en `https://api.jolpi.ca/ergast/f1` para obtener información sobre pilotos, constructores, carreras, clasificaciones y sprints.

Las biografías y retratos de los pilotos se almacenan localmente en `src/domain/f1/driversBio.ts` y `src/domain/f1/driversImage.ts`, y las banderas de países se renderizan con [`react-world-flags`](https://github.com/CodeYellowBV/react-world-flags).

El estado del servidor y la caché se gestionan con [TanStack Query (React Query)](https://tanstack.com/query): los hooks tipados de consulta viven en `src/hooks/queries/` y las claves compartidas de consulta están centralizadas en `src/services/api/queryKeys.ts`. Las [React Query Devtools](https://tanstack.com/query/latest/docs/framework/react/devtools) se montan automáticamente en desarrollo. Las peticiones HTTP se realizan con [Axios](https://axios-http.com/), el enrutado usa [React Router](https://reactrouter.com/) y la interfaz está compuesta con [Material UI](https://mui.com/), [Tailwind CSS v4](https://tailwindcss.com/) (mediante `@tailwindcss/vite`), [react-icons](https://react-icons.github.io/react-icons/) y notificaciones de [react-toastify](https://fkhadra.github.io/react-toastify/). Un [`ErrorBoundary`](./src/components/ErrorBoundary/ErrorBoundary.tsx) de nivel superior envuelve las vistas enrutadas para mostrar fallos inesperados de forma elegante.

# 🚀 Primeros pasos

### Requisitos previos

- [Node.js](https://nodejs.org/) **20.19+** (o **22.12+**) y `npm`: requerido por Vite 8

### Instalación

```bash
git clone https://github.com/ItzAle/f1-app.git
cd f1-app
npm install
```

El script `prepare` configurará automáticamente los hooks de Git de [Husky](https://typicode.github.io/husky/) después de la instalación; en cada commit, [lint-staged](https://github.com/lint-staged/lint-staged) ejecuta ESLint y Prettier sobre los archivos en staging.

### Scripts disponibles

| Script                 | Descripción                                                                                      |
| ---------------------- | ------------------------------------------------------------------------------------------------ |
| `npm start`            | Alias de `npm run dev`. Inicia el servidor de desarrollo de Vite en `:3000` y abre el navegador. |
| `npm run dev`          | Inicia el servidor de desarrollo de Vite con recarga en caliente.                                |
| `npm run build`        | Genera el bundle de producción en el directorio `build/`.                                        |
| `npm run preview`      | Previsualiza localmente la build de producción.                                                  |
| `npm run typecheck`    | Ejecuta la comprobación estricta de TypeScript para el código de la app y la configuración.      |
| `npm test`             | Ejecuta los tests unitarios con [Vitest](https://vitest.dev/).                                   |
| `npm run lint`         | Analiza el proyecto con [ESLint](https://eslint.org/) (flat config).                             |
| `npm run lint:fix`     | Ejecuta ESLint con `--fix` para corregir automáticamente los problemas corregibles.              |
| `npm run format`       | Formatea el proyecto con [Prettier](https://prettier.io/).                                       |
| `npm run format:check` | Comprueba el formato sin escribir cambios.                                                       |

Por defecto, el servidor de desarrollo se ejecuta en [http://localhost:3000](http://localhost:3000) (configurado en `vite.config.ts`).

### Alias de importación

Los siguientes alias de importación están configurados tanto en `vite.config.ts` como en `tsconfig.json`:

| Alias           | Resuelve a         |
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

# 🗺️ Rutas

| Ruta                    | Vista                                                          |
| ----------------------- | -------------------------------------------------------------- |
| `/`                     | Página principal (cuenta atrás, últimos resultados, feed de X) |
| `/driverstandings`      | Clasificación del campeonato de pilotos                        |
| `/constructorstandings` | Clasificación del campeonato de constructores                  |
| `/schedule`             | Calendario completo de la temporada                            |
| `/driver/:id`           | Perfil individual de piloto                                    |
| `/constructor/:id`      | Perfil individual de constructor                               |
| `/race`                 | Índice de carreras                                             |
| `/race/:race`           | Resultados de carrera para una ronda concreta                  |
| `/qualifying/`          | Índice de clasificaciones                                      |
| `/qualifying/:round`    | Resultados de clasificación para una ronda concreta            |
| `/sprint/:round`        | Resultados de sprint para una ronda concreta                   |
| `*`                     | Redirige a la página principal                                 |

# 🗂️ Estructura del proyecto

```text
.
├── public/                 # Recursos estáticos servidos tal cual
├── src/
│   ├── app/                # Responsabilidades del armazón de la app (router/layout)
│   │   └── router.tsx
│   ├── assets/             # Fuentes e imágenes importadas por la app
│   ├── components/         # Componentes UI reutilizables
│   │   ├── Cards/
│   │   ├── ErrorBoundary/       # Error boundary de nivel superior
│   │   ├── ExternalLink/
│   │   ├── Footer/
│   │   ├── ImageWithFallback/
│   │   ├── LastRaceResults/
│   │   ├── Loader/
│   │   ├── MobileMenu/
│   │   ├── NavBar/
│   │   ├── RaceCountDown/
│   │   ├── RedirectToLandingPage/
│   │   ├── NewsFeed/
│   │   └── ThemeSwitch/
│   ├── domain/             # Datos específicos de F1 y helpers de mapeo
│   │   └── f1/                  # Bios/imágenes de pilotos, cascos, banderas, logos y coches
│   ├── hooks/              # Hooks personalizados
│   │   ├── useFavicon.ts
│   │   └── queries/             # Hooks tipados de React Query (pilotos, constructores, carreras)
│   ├── pages/              # Páginas principales enrutadas
│   │   ├── ConstructorProfile/
│   │   ├── ConstructorStandings/
│   │   ├── DriverProfile/
│   │   ├── DriverStandings/
│   │   ├── LandingPage/
│   │   ├── Qualifying/          QualifyingResults/
│   │   ├── RaceResults/         Races/
│   │   ├── Schedule/
│   │   └── SprintResults/
│   ├── services/           # Clientes de servicios externos y wrappers de API
│   │   └── api/                 # Cliente Axios, wrappers de Jolpica, query keys (+ tests)
│   ├── styles/             # Entrypoints CSS globales y variables de diseño
│   │   ├── App.css
│   │   ├── global.css
│   │   └── index.css
│   ├── global.d.ts         # Declaraciones de TypeScript globales
│   └── index.tsx           # Punto de entrada React (QueryClient, RouterProvider, devtools)
├── eslint.config.mjs       # Configuración flat de ESLint
├── tsconfig.json           # Configuración de TypeScript (con path aliases)
├── vite.config.ts          # Configuración de Vite + Vitest + Tailwind
└── package.json
```

# 🧪 Pruebas

Los tests unitarios viven junto a los módulos que cubren (por ejemplo `src/services/api/*.test.ts`, `src/hooks/**/*.test.ts`, `src/components/**/*.test.tsx`, `src/pages/**/*.test.tsx`, `src/App.test.tsx`) y se ejecutan con [Vitest](https://vitest.dev/) en un entorno `jsdom`, usando [@testing-library/react](https://testing-library.com/docs/react-testing-library/intro/) y [@testing-library/jest-dom](https://github.com/testing-library/jest-dom). La cobertura la proporciona [`@vitest/coverage-v8`](https://vitest.dev/guide/coverage).

```bash
npm test
```

# 🖌️ Proyecto en Figma

El diseño mobile-first se realizó en Figma. Puedes ver el proyecto [aquí](https://www.figma.com/design/ODMeDrwZXAJ3uYMqaNU37N/Untitled?node-id=45-1226&t=FxrkAr6LKEDzR72J-1).

# 💻 Competencias técnicas

- Desarrollar componentes React de forma atómica
- Gestionar el estado de un componente funcional de React (hooks)
- Gestionar el ciclo de vida de los componentes React
- Utilizar eventos de UI
- Consumir una API REST (Jolpica F1, Wikipedia)
- Cachear y sincronizar estado del servidor con React Query (hooks tipados, claves compartidas)
- Enrutado del lado cliente con React Router
- Asincronía con `async`/`await` y Axios
- Añadir feedback al usuario (toasts, loaders, countdowns) para una buena UX
- Recuperarse de errores en tiempo de ejecución con un React Error Boundary de nivel superior
- Escribir componentes y APIs en TypeScript con opciones estrictas del compilador
- Estilizar con Tailwind CSS v4 junto con Material UI
- Garantizar la calidad del código con ESLint, Prettier, Husky y lint-staged
- Escribir tests unitarios con Vitest y Testing Library, y medir cobertura con v8

# 🖥️ Tecnologías

![HTML5](https://img.shields.io/badge/html5-%23E34F26.svg?style=for-the-badge&logo=html5&logoColor=white)
![CSS3](https://img.shields.io/badge/css3-%231572B6.svg?style=for-the-badge&logo=css3&logoColor=white)
![JavaScript](https://img.shields.io/badge/javascript-%23323330.svg?style=for-the-badge&logo=javascript&logoColor=%23F7DF1E)
![TypeScript](https://img.shields.io/badge/typescript-%23007ACC.svg?style=for-the-badge&logo=typescript&logoColor=white)
![React](https://img.shields.io/badge/react-%2320232a.svg?style=for-the-badge&logo=react&logoColor=%2361DAFB)
![Vite](https://img.shields.io/badge/vite-%23646CFF.svg?style=for-the-badge&logo=vite&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/tailwindcss-%2338B2AC.svg?style=for-the-badge&logo=tailwind-css&logoColor=white)
![MUI](https://img.shields.io/badge/MUI-%230081CB.svg?style=for-the-badge&logo=mui&logoColor=white)
![React Query](https://img.shields.io/badge/React%20Query-FF4154?style=for-the-badge&logo=reactquery&logoColor=white)
![React Router](https://img.shields.io/badge/React%20Router-CA4245?style=for-the-badge&logo=reactrouter&logoColor=white)
![Axios](https://img.shields.io/badge/axios-671ddf?style=for-the-badge&logo=axios&logoColor=white)
![ESLint](https://img.shields.io/badge/ESLint-4B32C3?style=for-the-badge&logo=eslint&logoColor=white)
![Prettier](https://img.shields.io/badge/Prettier-F7B93E?style=for-the-badge&logo=prettier&logoColor=black)
![Vitest](https://img.shields.io/badge/Vitest-6E9F18?style=for-the-badge&logo=vitest&logoColor=white)
![Vercel](https://img.shields.io/badge/vercel-%23000000.svg?style=for-the-badge&logo=vercel&logoColor=white)

# 🛠️ Herramientas

![Figma](https://img.shields.io/badge/figma-%23F24E1E.svg?style=for-the-badge&logo=figma&logoColor=white)
![Visual Studio Code](https://img.shields.io/badge/Visual%20Studio%20Code-0078d7.svg?style=for-the-badge&logo=visual-studio-code&logoColor=white)
![Trello](https://img.shields.io/badge/Trello-%23026AA7.svg?style=for-the-badge&logo=Trello&logoColor=white)
![Git](https://img.shields.io/badge/git-%23F05033.svg?style=for-the-badge&logo=git&logoColor=white)
![GitHub](https://img.shields.io/badge/github-%23121011.svg?style=for-the-badge&logo=github&logoColor=white)

# 🔒 Seguridad

Si descubres un problema de seguridad, sigue el proceso de divulgación descrito en [SECURITY.md](./SECURITY.md).

# 📄 Licencia

Este proyecto está licenciado bajo los términos del archivo [LICENSE](./LICENSE) de este repositorio.

# ❗ Aviso

Este sitio web no es oficial y no está asociado de ninguna manera con las empresas de Formula 1. F1, FORMULA ONE, FORMULA 1, FIA FORMULA ONE WORLD CHAMPIONSHIP, GRAND PRIX y las marcas relacionadas son marcas registradas de Formula One Licensing B.V.
