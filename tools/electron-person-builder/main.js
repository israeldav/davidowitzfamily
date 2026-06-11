const { app, BrowserWindow, dialog, ipcMain } = require("electron");
const fs = require("fs/promises");
const path = require("path");

const PROJECT_ROOT = path.resolve(__dirname, "..", "..");
const FAMILY_ROOT = path.join(PROJECT_ROOT, "static", "family");
const PEOPLE_ROOT = path.join(FAMILY_ROOT, "people");
const IMG_ROOT = path.join(FAMILY_ROOT, "img");

function createWindow() {
  const window = new BrowserWindow({
    width: 1280,
    height: 960,
    minWidth: 980,
    minHeight: 760,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  window.loadFile(path.join(__dirname, "index.html"));
}

app.whenReady().then(() => {
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

ipcMain.handle("pick-media-files", async () => {
  const window = BrowserWindow.getFocusedWindow();
  const result = await dialog.showOpenDialog(window, {
    properties: ["openFile", "multiSelections"],
    filters: [
      {
        name: "Images and PDFs",
        extensions: ["jpg", "jpeg", "png", "gif", "webp", "pdf"],
      },
      { name: "All Files", extensions: ["*"] },
    ],
  });

  if (result.canceled) {
    return [];
  }

  return result.filePaths;
});

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function linkifyValue(value, href = "") {
  const linkedValue = escapeHtml(value).replace(
    /\[([^\]]+)\]\(([^)]+)\)/g,
    '<a href="$2">$1</a>'
  );

  if (!href || !value) {
    return linkedValue;
  }

  return `<a href="${escapeHtml(href)}">${linkedValue}</a>`;
}

function renderFacts(facts) {
  return facts
    .filter((fact) => fact.label || fact.value || fact.href)
    .map((fact) => {
      const label = escapeHtml(fact.label || "");
      const value = linkifyValue(fact.value || "", fact.href || "");

      if (fact.label && fact.value) {
        return `          <li>${label} ${value}</li>`;
      }

      if (fact.label) {
        return `          <li>${label}</li>`;
      }

      return `          <li>${value}</li>`;
    })
    .join("\n");
}

function renderMediaBlocks(mediaItems) {
  return mediaItems
    .filter((item) => item.relativePath)
    .map((item) => {
      const mediaTag =
        item.kind === "pdf"
          ? `<embed title="${escapeHtml(
              path.basename(item.relativePath)
            )}" src="${escapeHtml(item.relativePath)}" width="50%" height="700">`
          : `<img src="${escapeHtml(
              item.relativePath
            )}" width="50%" style="height: auto;">`;

      if (item.link) {
        return [
          "    <br />",
          `    <a href="${escapeHtml(
            item.link
          )}" target="_blank" rel="noopener noreferrer">`,
          `      ${mediaTag}`,
          "    </a>",
        ].join("\n");
      }

      return ["    <br />", `    ${mediaTag}`].join("\n");
    })
    .join("\n");
}

function buildHtml(payload) {
  const facts = renderFacts(payload.facts) || "          <li></li>";
  const media = renderMediaBlocks(payload.mediaItems);

  return `<!DOCTYPE html>

<html lang="en">
  <head>
    <meta charset="utf-8" />
    <link rel="icon" href="%PUBLIC_URL%/favicon.ico" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <link rel="stylesheet" href="styles.css" />
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Oxygen:wght@300&display=swap" rel="stylesheet">
  </head>
  <body>
    <h1 id="buttons" style="text-align: left; float: left;">
      <a id="link" href="${escapeHtml(payload.homeLink)}">Home</a>
    </h1>
    <h1 style="text-align: center;">
        ${escapeHtml(payload.pageTitle)}
    </h1>

        <br></br>
        <ul>
${facts}
        </ul>
        <br></br>
        <br></br>
${media ? `${media}\n` : ""}
  </body>
</html>
`;
}

async function ensureDir(dirPath) {
  await fs.mkdir(dirPath, { recursive: true });
}

async function copyMediaFiles(folderName, mediaItems) {
  if (!folderName || !mediaItems.length) {
    return mediaItems.map((item) => ({
      ...item,
      relativePath: item.manualPath || "",
    }));
  }

  const targetDir = path.join(IMG_ROOT, folderName);
  await ensureDir(targetDir);

  const saved = [];
  for (const item of mediaItems) {
    if (!item.sourcePath) {
      saved.push({
        ...item,
        relativePath: item.manualPath || "",
      });
      continue;
    }

    const fileName = path.basename(item.sourcePath);
    const targetPath = path.join(targetDir, fileName);
    await fs.copyFile(item.sourcePath, targetPath);
    saved.push({
      ...item,
      relativePath: path.posix.join("..", "img", folderName, fileName),
    });
  }

  return saved;
}

ipcMain.handle("create-person-page", async (_event, payload) => {
  if (!payload.pageTitle || !payload.fileName) {
    throw new Error("Person name and output file name are required.");
  }

  const safeFileName = payload.fileName.endsWith(".html")
    ? payload.fileName
    : `${payload.fileName}.html`;

  const pagePath = path.join(PEOPLE_ROOT, safeFileName);
  const savedMedia = await copyMediaFiles(payload.folderName, payload.mediaItems);
  const html = buildHtml({
    ...payload,
    fileName: safeFileName,
    mediaItems: savedMedia,
  });

  await fs.writeFile(pagePath, html, "utf8");

  return {
    pagePath,
    mediaFolder: payload.folderName
      ? path.join(IMG_ROOT, payload.folderName)
      : null,
    html,
  };
});
