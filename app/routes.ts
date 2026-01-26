import { type RouteConfig } from "@react-router/dev/routes";

export default [
  { file: "routes/all-sentences.tsx", index: true },
  { file: "routes/search.tsx", path: "/search" },
  { file: "routes/create.tsx", path: "/create" },
  { file: "routes/create-grammar.tsx", path: "/create-grammar" },
  { file: "routes/forvo-search.tsx", path: "/forvo-search" },
] satisfies RouteConfig;
