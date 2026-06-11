const factListEl = document.getElementById("fact-list");
const mediaListEl = document.getElementById("media-list");
const outputEl = document.getElementById("output");
const statusEl = document.getElementById("status");
const pageTitleEl = document.getElementById("page-title");
const fileNameEl = document.getElementById("file-name");
const homeLinkEl = document.getElementById("home-link");
const folderNameEl = document.getElementById("folder-name");
let fileNameTouched = false;
let folderNameTouched = false;

function slugFileName(value) {
  const cleaned = value
    .normalize("NFKD")
    .replace(/[^a-zA-Z0-9\s]/g, "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (!cleaned.length) {
    return "";
  }

  const joined = cleaned
    .map((part, index) =>
      index === 0
        ? part.charAt(0).toLowerCase() + part.slice(1)
        : part.charAt(0).toUpperCase() + part.slice(1)
    )
    .join("");

  return `${joined}.html`;
}

function syncFileNameFromTitle() {
  if (fileNameTouched) {
    return;
  }
  fileNameEl.value = slugFileName(pageTitleEl.value);
}

function syncFolderNameFromTitle() {
  if (folderNameTouched) {
    return;
  }
  folderNameEl.value = slugFileName(pageTitleEl.value).replace(/\.html$/, "");
}

function moveFactRow(item, direction) {
  const sibling =
    direction < 0 ? item.previousElementSibling : item.nextElementSibling;

  if (!sibling) {
    return;
  }

  if (direction < 0) {
    factListEl.insertBefore(item, sibling);
    return;
  }

  factListEl.insertBefore(sibling, item);
}

function createFactRow(label = "", value = "", href = "") {
  const item = document.createElement("div");
  item.className = "item";
  item.innerHTML = `
    <div class="fact-grid">
      <div class="field">
        <label>Label</label>
        <input type="text" class="fact-label" value="${label}" placeholder="Father">
      </div>
      <div class="field">
        <label>Value</label>
        <input type="text" class="fact-value" value="${value}" placeholder="Leib (Leba)">
      </div>
      <div class="field">
        <label>Value Link (Optional)</label>
        <input type="text" class="fact-href" value="${href}" placeholder="./moshe.html or https://example.com">
      </div>
      <button type="button" class="move-up icon-button" title="Move up">↑</button>
      <button type="button" class="move-down icon-button" title="Move down">↓</button>
      <button type="button" class="remove-row">Remove</button>
    </div>
  `;
  item.querySelector(".move-up").addEventListener("click", () => moveFactRow(item, -1));
  item.querySelector(".move-down").addEventListener("click", () => moveFactRow(item, 1));
  item.querySelector(".remove-row").addEventListener("click", () => item.remove());
  factListEl.appendChild(item);
}

function createMediaRow({ sourcePath = "", manualPath = "", link = "", kind = "image" } = {}) {
  const item = document.createElement("div");
  item.className = "item";
  item.innerHTML = `
    <div class="media-grid">
      <div class="field">
        <label>Selected File</label>
        <div class="path-text media-source">${sourcePath || "No file selected yet"}</div>
      </div>
      <div class="field">
        <label>External Click-through Link</label>
        <input type="text" class="media-link" value="${link}" placeholder="https://example.com">
      </div>
      <div class="field">
        <label>Type</label>
        <select class="media-kind">
          <option value="image">Image</option>
          <option value="pdf">PDF</option>
        </select>
      </div>
      <button type="button" class="remove-row">Remove</button>
    </div>
    <div class="row">
      <button type="button" class="pick-file">Pick Local File</button>
      <div class="field" style="flex: 1 1 320px;">
        <label>Or Use Existing Relative Path</label>
        <input type="text" class="manual-path" value="${manualPath}" placeholder="../img/rivkahDavidowitz/photo1.jpg">
      </div>
    </div>
  `;

  item.querySelector(".media-kind").value = kind;
  item.dataset.sourcePath = sourcePath;

  item.querySelector(".pick-file").addEventListener("click", async () => {
    const picked = await window.personBuilder.pickMediaFiles();
    if (picked.length) {
      item.dataset.sourcePath = picked[0];
      item.querySelector(".media-source").textContent = picked[0];
    }
  });

  item.querySelector(".remove-row").addEventListener("click", () => item.remove());
  mediaListEl.appendChild(item);
}

function collectFacts() {
  return Array.from(factListEl.querySelectorAll(".item")).map((item) => ({
    label: item.querySelector(".fact-label").value.trim(),
    value: item.querySelector(".fact-value").value.trim(),
    href: item.querySelector(".fact-href").value.trim(),
  }));
}

function collectMedia() {
  return Array.from(mediaListEl.querySelectorAll(".item")).map((item) => ({
    sourcePath: item.dataset.sourcePath || "",
    manualPath: item.querySelector(".manual-path").value.trim(),
    link: item.querySelector(".media-link").value.trim(),
    kind: item.querySelector(".media-kind").value,
  }));
}

function payload() {
  return {
    pageTitle: pageTitleEl.value.trim(),
    fileName: fileNameEl.value.trim(),
    homeLink: homeLinkEl.value.trim() || "../newTree.html",
    folderName: folderNameEl.value.trim(),
    facts: collectFacts(),
    mediaItems: collectMedia(),
  };
}

async function createPage() {
  statusEl.textContent = "Creating page...";
  try {
    const result = await window.personBuilder.createPersonPage(payload());
    outputEl.value = result.html;
    statusEl.textContent =
      `Created page:\n${result.pagePath}` +
      (result.mediaFolder ? `\nMedia folder:\n${result.mediaFolder}` : "");
  } catch (error) {
    statusEl.textContent = `Error: ${error.message}`;
  }
}

async function copyHtml() {
  if (!outputEl.value.trim()) {
    statusEl.textContent = "Create the page first so there is HTML to copy.";
    return;
  }
  await navigator.clipboard.writeText(outputEl.value);
  statusEl.textContent = "Generated HTML copied to clipboard.";
}

function fillSample() {
  pageTitleEl.value = "Rivka (Regina) Davidowitz nee Herskovics";
  fileNameTouched = true;
  folderNameTouched = true;
  fileNameEl.value = "rivkahDavidowitz.html";
  homeLinkEl.value = "../newTree.html";
  folderNameEl.value = "rivkahDavidowitz";
  factListEl.innerHTML = "";
  mediaListEl.innerHTML = "";
  createFactRow("b.", "Sep 1888");
  createFactRow("Father:", "Leib (Leba)");
  createFactRow("Mother:", "Poli (Toli) nee Klein");
  createFactRow("Spouse:", "Moshe", "./moshe.html");
  createFactRow("m.", "Dec 31, 1907");
  createFactRow("d.", "Jan 29, 1920 | Shevat 10");
  createFactRow("Buried", "");
  createMediaRow({ manualPath: "../img/rivkahDavidowitz/WhatsApp Image 2025-06-24 at 13.54.17.jpeg" });
  statusEl.textContent = "Sample fields loaded.";
}

function clearAll() {
  pageTitleEl.value = "";
  fileNameTouched = false;
  folderNameTouched = false;
  fileNameEl.value = "";
  homeLinkEl.value = "../newTree.html";
  folderNameEl.value = "";
  factListEl.innerHTML = "";
  mediaListEl.innerHTML = "";
  outputEl.value = "";
  statusEl.textContent = "All fields cleared.";
  createFactRow("", "");
  createMediaRow();
  syncFileNameFromTitle();
  syncFolderNameFromTitle();
}

document.getElementById("add-fact").addEventListener("click", () => createFactRow());
document.getElementById("add-media").addEventListener("click", () => createMediaRow());
document.getElementById("fill-sample").addEventListener("click", fillSample);
document.getElementById("clear-all").addEventListener("click", clearAll);
document.getElementById("create-page").addEventListener("click", createPage);
document.getElementById("copy-html").addEventListener("click", copyHtml);
pageTitleEl.addEventListener("input", () => {
  syncFileNameFromTitle();
  syncFolderNameFromTitle();
});
fileNameEl.addEventListener("input", () => {
  fileNameTouched = fileNameEl.value.trim().length > 0;
});
folderNameEl.addEventListener("input", () => {
  folderNameTouched = folderNameEl.value.trim().length > 0;
});

createFactRow("b.", "");
createFactRow("Father:", "");
createFactRow("Mother:", "");
createFactRow("Spouse:", "");
createMediaRow();
syncFileNameFromTitle();
syncFolderNameFromTitle();
