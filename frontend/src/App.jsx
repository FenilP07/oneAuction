import React from "react";
import { Outlet } from "react-router-dom";
import "bootstrap/dist/css/bootstrap.min.css";
import Navbar from "./components/Navbar";
import "./App.css";

function App() {
  return (
    <>
      <main>
        <Outlet />
      </main>
    </>
  );
}

export default App;
