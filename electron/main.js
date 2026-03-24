const { app, BrowserWindow, ipcMain } = require("electron");
const path = require("path");

const { fetchEmails } = require("./services/gmail/imapClient");

function createWindow() {
  const win = new BrowserWindow({
    width: 1400,
    height: 900,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
    },
  });

  const startUrl = "http://localhost:3000";

  const loadApp = () => {
    win.loadURL(startUrl).catch(() => {
      console.log("Retrying React load...");
      setTimeout(loadApp, 1000);
    });
  };

  setTimeout(loadApp, 2000);
}

// 🔥 IPC handler
ipcMain.handle("get-dashboard-data", async () => {
  try {
    const emails = await fetchEmails();

    console.log("Fetched Emails 🔥:", emails);

    return emails;
  } catch (error) {
    console.error("Error fetching emails:", error);
    return [];
  }
});

app.whenReady().then(createWindow);

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});