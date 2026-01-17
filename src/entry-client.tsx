import React from "react";
import { createRoot } from "react-dom/client";
import { createBrowserRouter, RouterProvider, Outlet } from "react-router-dom";
import AuthProvider from "../app/auth/AuthProvider";
import { Layout } from "../app/root";
import AllSentences from "../app/routes/all-sentences";
import Search from "../app/routes/search";
import Create from "../app/routes/create";
import "../app.css";

const router = createBrowserRouter([
  {
    path: "/",
    element: (
      <AuthProvider>
        <Layout>
          <Outlet />
        </Layout>
      </AuthProvider>
    ),
      children: [
      { index: true, element: <AllSentences /> },
      { path: "search", element: <Search /> },
      { path: "create", element: <Create /> },
    ],
  },
]);

const container = document.getElementById("root");
if (container) {
  createRoot(container).render(
    <React.StrictMode>
      <RouterProvider router={router} />
    </React.StrictMode>
  );
}
