const path = require("path");
const { pathToFileURL } = require("url");

// __dirname is available in .cjs files
(async () => {
  try {
    const serverPath = path.join(__dirname, "src", "server.js");
    const serverUrl = pathToFileURL(serverPath).href;
    await import(serverUrl); // this runs your ESM server.js (which calls app.listen)
  } catch (err) {
    console.error("Failed to start ESM server.js:", err);
  }
})();