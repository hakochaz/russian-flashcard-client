import { isRouteErrorResponse, Outlet, Link, ScrollRestoration, Meta, Links, Scripts, useLocation } from "react-router-dom";

// Import styles of packages that you've installed.
// All packages except `@mantine/hooks` require styles imports
import '@mantine/core/styles.css';
import { ColorSchemeScript, MantineProvider, mantineHtmlProps, Text, createTheme, Button } from '@mantine/core';

import type { Route } from "./+types/root";
import "./app.css";
import AuthProvider, { useAuth } from "./auth/AuthProvider";

const theme = createTheme({
  primaryColor: 'blue',
  defaultRadius: 'md',
});

function Navigation() {
  const location = useLocation();
  const { logout, account } = useAuth();
  
  const navItems = [
    { to: "/", label: "All Sentences", icon: "📚" },
    { to: "/search", label: "Sentences Search", icon: "🔍" },
    { to: "/create", label: "Create Sentences", icon: "✏️" },
    { to: "/create-grammar", label: "Create Grammar", icon: "📝" },
    { to: "/forvo-search", label: "Forvo Sentence Search", icon: "🎙️" },
    { to: "/forvo-word-search", label: "Forvo Word Search", icon: "🔊" },
    { to: "/shadowing", label: "Shadowing", icon: "🗣️" },
    { to: "/letters", label: "Letters", icon: "🔤" },
    { to: "/minimal-pairs", label: "Minimal Pairs", icon: "👂" },
  ];

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  return (
    <div className="flex flex-col h-full">
      <nav className="mt-6 flex flex-col gap-1 flex-1">
        {navItems.map(({ to, label, icon }) => {
          const isActive = location.pathname === to;
          return (
            <Link
              key={to}
              to={to}
              className={`px-3 py-2.5 rounded-lg flex items-center gap-3 transition-all duration-200 group ${
                isActive
                  ? 'bg-blue-50 text-blue-700 font-medium shadow-sm'
                  : 'text-gray-700 hover:bg-gray-50 hover:translate-x-0.5'
              }`}
            >
              <span className="text-lg">{icon}</span>
              <span className="text-sm">{label}</span>
            </Link>
          );
        })}
      </nav>
      
      {/* Logout section at bottom */}
      <div className="mt-auto pt-4 border-t border-gray-200">
        {account && (
          <div className="px-3 py-2 mb-3">
            <Text size="xs" c="dimmed" className="truncate">
              {account.username}
            </Text>
          </div>
        )}
        <Button
          variant="light"
          color="red"
          fullWidth
          onClick={handleLogout}
          className="hover:shadow-sm transition-all"
          leftSection={<span>🚪</span>}
        >
          Log Out
        </Button>
      </div>
    </div>
  );
}

export function Layout({ children }: { children: React.ReactNode }) {
  const isClient = typeof document !== "undefined";

  const layout = (
    <MantineProvider theme={theme}>
      <div className="flex min-h-screen bg-gray-50">
        {/* Sidebar */}
        <aside className="w-64 bg-white border-r border-gray-200 shadow-sm flex flex-col h-screen sticky top-0">
          <div className="p-6 border-b border-gray-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center text-white text-xl shadow-md">
                🇷🇺
              </div>
              <div>
                <Text className="font-bold text-gray-900 text-lg leading-tight">Russian</Text>
                <Text className="text-xs text-gray-500">Flashcards</Text>
              </div>
            </div>
          </div>
          <div className="px-4 pb-4 flex-1 flex flex-col overflow-y-auto">
            <Navigation />
          </div>
        </aside>
        
        {/* Main content */}
        <div className="flex-1 flex flex-col">
          {/* Header */}
          <header className="bg-white border-b border-gray-200 shadow-sm sticky top-0 z-10">
            <div className="px-8 py-4">
              <Text className="text-sm text-gray-600">Welcome back! 👋</Text>
            </div>
          </header>
          
          {/* Content */}
          <main className="flex-1 p-8">
            <div className="max-w-7xl mx-auto">
              {children}
            </div>
          </main>
        </div>
      </div>
    </MantineProvider>
  );

  // The rest of the function remains unchanged

  if (!isClient) {
    return (
      <html lang="en" {...mantineHtmlProps}>
        <head>
          <meta charSet="utf-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1" />
          <ColorSchemeScript />
          <Meta />
          <Links />
          <script async src="https://cse.google.com/cse.js?cx=f1a874e493dc94593"></script>
        </head>
        <body>
          <AuthProvider>{layout}</AuthProvider>
          <ScrollRestoration />
          <Scripts />
        </body>
      </html>
    );
  }

  return (
    <>
      <AuthProvider>{layout}</AuthProvider>
      <ScrollRestoration />
    </>
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

