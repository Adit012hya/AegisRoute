import { createBrowserRouter } from "react-router";
import { LandingPage } from "./components/LandingPage";
import { MainApp } from "./components/MainApp";
import { MapPage } from "./components/MapPage";

export const router = createBrowserRouter([
  {
    path: "/",
    Component: LandingPage,
  },
  {
    path: "/app",
    Component: MainApp,
  },
  {
    path: "/map",
    Component: MapPage,
  },
]);
