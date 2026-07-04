import ReactDOM from "react-dom/client";
import "./styles/index.css";
import "./assets/fonts/Formula1-Bold.otf";
import "./assets/fonts/Formula1-Regular.otf";
import "./assets/fonts/Formula1-Wide.otf";
import "./app/i18n";
import reportWebVitals from "./reportWebVitals";
import { RouterProvider } from "@tanstack/react-router";
import { QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { TanStackRouterDevtools } from "@tanstack/react-router-devtools";
import { router } from "./app/router";
import { queryClient } from "./app/queryClient";

const rootElement = document.getElementById("root");

if (!rootElement) {
  throw new Error("Root element #root was not found");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <QueryClientProvider client={queryClient}>
    <RouterProvider router={router} />
    {import.meta.env.DEV && (
      <>
        <ReactQueryDevtools initialIsOpen={false} />
        <TanStackRouterDevtools router={router} initialIsOpen={false} />
      </>
    )}
  </QueryClientProvider>
);

reportWebVitals();
