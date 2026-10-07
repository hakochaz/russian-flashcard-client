import { isRouteErrorResponse, Outlet, Link, ScrollRestoration, Meta, Links, Scripts, useLocation } from "react-router-dom";

// Import styles of packages that you've installed.
// All packages except `@mantine/hooks` require styles imports
import '@mantine/core/styles.css';
import { ColorSchemeScript, MantineProvider, mantineHtmlProps, Text, createTheme, Button, ActionIcon, useMantineColorScheme, useComputedColorScheme, Tooltip } from '@mantine/core';

import type { Route } from "./+types/root";
import "./app.css";
import AuthProvider, { useAuth } from "./auth/AuthProvider";

const theme = createTheme({
  primaryColor: 'blue',
  defaultRadius: 'md',
});

function ColorSchemeToggle() {
  const { setColorScheme } = useMantineColorScheme();
  const computedColorScheme = useComputedColorScheme('light');
  const isDark = computedColorScheme === 'dark';

  return (
    <Tooltip label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}>
      <ActionIcon
        onClick={() => setColorScheme(isDark ? 'light' : 'dark')}
        variant="default"
        size="lg"
        radius="md"
        aria-label="Toggle color scheme"
      >
        <span className="text-lg leading-none">{isDark ? '☀️' : '🌙'}</span>
      </ActionIcon>
    </Tooltip>
  );
}

function Navigation() {
  const location = useLocation();
  const { logout, account } = useAuth();
  
  const navItems = [
    { to: "/", label: "All Sentences", icon: "📚" },
    { to: "/search", label: "Sentences Search", icon: "🔍" },
    { to: "/create", label: "Create Sentences", icon: "✏️" },
    { to: "/create-grammar", label: "Create Grammar", icon: "📝" },
    { to: "/combined-search", label: "Combined Search", icon: "🔎" },
    { to: "/forvo-search", label: "Forvo Sentence Search", icon: "🎙️" },
    { to: "/forvo-word-search", label: "Forvo Word Search", icon: "🔊" },
    { to: "/shadowing", label: "Shadowing", icon: "🗣️" },
    { to: "/letters", label: "Letters", icon: "🔤" },
    { to: "/minimal-pairs", label: "Minimal Pairs", icon: "👂" },
  ];

  const ankiToolItems = [
    { to: "/anki-tools/lr-stress-marks", label: "LR Russian Stress Marks", icon: "✍️" },
    { to: "/anki-tools/lr-word-metadata", label: "LR Word Metadata", icon: "🏷️" },
  ];

  const renderNavLink = ({ to, label, icon }: { to: string; label: string; icon: string }) => {
    const isActive = location.pathname === to;
    return (
      <Link
        key={to}
        to={to}
        className={`px-3 py-2.5 rounded-lg flex items-center gap-3 transition-all duration-200 group ${
          isActive
            ? 'bg-blue-50 text-blue-700 font-medium shadow-sm dark:bg-blue-950 dark:text-blue-300'
            : 'text-gray-700 hover:bg-gray-50 hover:translate-x-0.5 dark:text-gray-300 dark:hover:bg-gray-800'
        }`}
      >
        <span className="text-lg">{icon}</span>
        <span className="text-sm">{label}</span>
      </Link>
    );
  };

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
        {navItems.map(renderNavLink)}

        <Text size="xs" tt="uppercase" fw={600} c="dimmed" className="px-3 pt-5 pb-1 tracking-wider">
          Anki Tools
        </Text>
        {ankiToolItems.map(renderNavLink)}
      </nav>
      
      {/* Logout section at bottom */}
      <div className="mt-auto pt-4 border-t border-gray-200 dark:border-gray-800">
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
    <MantineProvider theme={theme} defaultColorScheme="auto">
      <div className="flex min-h-screen bg-gray-50 dark:bg-gray-950">
        {/* Sidebar */}
        <aside className="w-64 bg-white border-r border-gray-200 shadow-sm flex flex-col h-screen sticky top-0 dark:bg-gray-900 dark:border-gray-800">
          <div className="p-6 border-b border-gray-100 dark:border-gray-800">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center text-white text-xl shadow-md">
                🇷🇺
              </div>
              <div>
                <Text className="font-bold text-gray-900 text-lg leading-tight dark:text-white">Russian</Text>
                <Text className="text-xs text-gray-500 dark:text-gray-400">Flashcards</Text>
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
          <header className="bg-white border-b border-gray-200 shadow-sm sticky top-0 z-10 dark:bg-gray-900 dark:border-gray-800">
            <div className="px-8 py-4 flex items-center justify-between">
              <Text className="text-sm text-gray-600 dark:text-gray-400">Welcome back! 👋</Text>
              <ColorSchemeToggle />
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
          <ColorSchemeScript defaultColorScheme="auto" />
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

