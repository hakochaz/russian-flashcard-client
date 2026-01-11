import { type RouteConfig } from "@react-router/dev/routes";

export default [
  { file: "routes/all-sentences.tsx", index: true },
  { file: "routes/search.tsx", path: "/search" },
] satisfies RouteConfig;
