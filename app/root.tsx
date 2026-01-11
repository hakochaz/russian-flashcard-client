import {
  isRouteErrorResponse,
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
  Link,
} from "react-router";

// Import styles of packages that you've installed.
// All packages except `@mantine/hooks` require styles imports
import '@mantine/core/styles.css';
import { ColorSchemeScript, MantineProvider, mantineHtmlProps, Text } from '@mantine/core';

import type { Route } from "./+types/root";
import "./app.css";

export function Layout({ children }: { children: React.ReactNode }) {
  const isClient = typeof document !== "undefined";

  if (!isClient) {
    return (
      <html lang="en" {...mantineHtmlProps}>
        <head>
          <meta charSet="utf-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1" />
          <ColorSchemeScript />
          <Meta />
          <Links />
        </head>
        <body>
          <MantineProvider>
            <div className="flex min-h-screen">
              <aside className="w-56 border-r p-4">
                <div style={{ height: 60 }} className="flex items-center">
                  <Text style={{ fontWeight: 700 }}>Russian Flashcards</Text>
                </div>
                <nav className="mt-4 flex flex-col gap-2">
                  <Link to="/" className="px-2 py-1 rounded hover:bg-gray-100">All Sentences</Link>
                  <Link to="/search" className="px-2 py-1 rounded hover:bg-gray-100">Search</Link>
                </nav>
              </aside>

              <main className="flex-1 p-6">{children}</main>
            </div>
          </MantineProvider>
          <ScrollRestoration />
          <Scripts />
        </body>
      </html>
    );
  }

  return (
    <MantineProvider>
      <div className="flex min-h-screen">
        <aside className="w-56 border-r p-4">
          <div style={{ height: 60 }} className="flex items-center">
            <Text style={{ fontWeight: 700 }}>Russian Flashcards</Text>
          </div>
          <nav className="mt-4 flex flex-col gap-2">
            <Link to="/" className="px-2 py-1 rounded hover:bg-gray-100">All Sentences</Link>
            <Link to="/search" className="px-2 py-1 rounded hover:bg-gray-100">Search</Link>
          </nav>
        </aside>

        <main className="flex-1 p-6">{children}</main>
      </div>
    </MantineProvider>
  );
}

export default function App() {
  return <Outlet />;
}

export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
  let message = "Oops!";
  let details = "An unexpected error occurred.";
  let stack: string | undefined;

  if (isRouteErrorResponse(error)) {
    message = error.status === 404 ? "404" : "Error";
    details =
      error.status === 404
        ? "The requested page could not be found."
        : error.statusText || details;
  } else if (import.meta.env.DEV && error && error instanceof Error) {
    details = error.message;
    stack = error.stack;
  }

  return (
    <main className="pt-16 p-4 container mx-auto">
      <h1>{message}</h1>
      <p>{details}</p>
      {stack && (
        <pre className="w-full p-4 overflow-x-auto">
          <code>{stack}</code>
        </pre>
      )}
    </main>
  );
}

