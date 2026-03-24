import { useEffect } from "react";
import logo from "./logo.svg";
import "./App.css";

function App() {
  useEffect(() => {
    async function fetchData() {
      try {
        const data = await window.electronAPI.getDashboardData();
        console.log("From Electron:", data);
      } catch (error) {
        console.error("Error:", error);
      }
    }

    fetchData();
  }, []);

  return (
    <div className="App">
      <header className="App-header">
        <img src={logo} className="App-logo" alt="logo" />

        <p>Electron + React Connected 🚀</p>

        <p>Open Console (F12) to see backend response</p>
      </header>
    </div>
  );
}

export default App;