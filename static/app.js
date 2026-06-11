const form = document.querySelector("#reminderForm");
const listPage = document.querySelector("#listPage");
const personPage = document.querySelector("#personPage");
const rows = document.querySelector("#reminderRows");
const message = document.querySelector("#message");
const reminderDetail = document.querySelector("#reminderDetail");
const personTitle = document.querySelector("#personTitle");
const personSubtitle = document.querySelector("#personSubtitle");
const personMessage = document.querySelector("#personMessage");
const personDetail = document.querySelector("#personDetail");
const personForm = document.querySelector("#personForm");
const personEditButton = document.querySelector("#personEditButton");
const personDeleteButton = document.querySelector("#personDeleteButton");
const personCancelEditButton = document.querySelector("#personCancelEditButton");
const personSaveButton = document.querySelector("#personSaveButton");
const addAttachmentButton = document.querySelector("#addAttachmentButton");
const attachmentInput = document.querySelector("#attachmentInput");
const attachmentList = document.querySelector("#attachmentList");
const attachmentPreviewOverlay = document.querySelector("#attachmentPreviewOverlay");
const attachmentPreviewTitle = document.querySelector("#attachmentPreviewTitle");
const attachmentPreviewBody = document.querySelector("#attachmentPreviewBody");
const closeAttachmentPreviewButton = document.querySelector("#closeAttachmentPreviewButton");
const addButton = document.querySelector("#addButton");
const addEmailButton = document.querySelector("#addEmailButton");
const viewEmailsButton = document.querySelector("#viewEmailsButton");
const addFamilyButton = document.querySelector("#addFamilyButton");
const modalOverlay = document.querySelector("#modalOverlay");
const closeModalButton = document.querySelector("#closeModalButton");
const editReminderButton = document.querySelector("#editReminderButton");
const cancelButton = document.querySelector("#cancelButton");
const modalTitle = document.querySelector("#modalTitle");
const saveReminderButton = document.querySelector("#saveReminderButton");
const familyForm = document.querySelector("#familyForm");
const familyModalOverlay = document.querySelector("#familyModalOverlay");
const closeFamilyModalButton = document.querySelector("#closeFamilyModalButton");
const cancelFamilyButton = document.querySelector("#cancelFamilyButton");
const emailForm = document.querySelector("#emailForm");
const emailModalOverlay = document.querySelector("#emailModalOverlay");
const closeEmailModalButton = document.querySelector("#closeEmailModalButton");
const cancelEmailButton = document.querySelector("#cancelEmailButton");
const emailModalTitle = document.querySelector("#emailModalTitle");
const emailFamilySelect = document.querySelector("#emailFamilySelect");
const emailReminderSelect = document.querySelector("#emailReminderSelect");
const saveEmailButton = document.querySelector("#saveEmailButton");
const emailListModalOverlay = document.querySelector("#emailListModalOverlay");
const closeEmailListModalButton = document.querySelector("#closeEmailListModalButton");
const emailRecipientRows = document.querySelector("#emailRecipientRows");
const filterButton = document.querySelector("#filterButton");
const familyFilterLabel = document.querySelector("#familyFilterLabel");
const familyFilterSelect = document.querySelector("#familyFilterSelect");
const familySelect = document.querySelector("#familySelect");
const personFamilySelect = document.querySelector("#personFamilySelect");
const secularDateInput = form.reminderDate;
const hebrewDayInput = form.hebrewDay;
const hebrewMonthSelect = form.hebrewMonth;
const hebrewYearSelect = form.hebrewYear;
const personSecularDateInput = personForm.reminderDate;
const personHebrewDayInput = personForm.hebrewDay;
const personHebrewMonthSelect = personForm.hebrewMonth;
const personHebrewYearSelect = personForm.hebrewYear;
const dateConversionStatus = document.querySelector("#dateConversionStatus");
let families = [];
let lastFamilyTrigger = addFamilyButton;
let dateConversionRequestId = 0;
let activeDateContext = null;
let isPopulatingDate = false;
let currentHebrewYear = null;
let reminders = [];
let emailRecipients = [];
let editingReminderId = null;
let editingEmailRecipientId = null;
let reminderFormMode = "edit";
let currentReminder = null;
let currentPersonReminder = null;
let currentPersonAttachments = [];
let selectedFamilyFilterId = "";
let isSavingReminder = false;
let isSavingEmail = false;
let isSavingPerson = false;
let isUploadingAttachment = false;

function setMessage(text, tone = "") {
  message.textContent = text;
  message.className = `message ${tone}`;
}

function setPersonMessage(text, tone = "") {
  personMessage.textContent = text;
  personMessage.className = `message ${tone}`;
}

async function request(path, options = {}) {
  const response = await fetch(path, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload.error || "Request failed.");
  }
  return payload;
}

function formatHebrewDate(reminder) {
  return [reminder.hebrewDay, reminder.hebrewMonth, reminder.hebrewYear]
    .filter(Boolean)
    .join(" ");
}

function formatSecularDate(date) {
  const match = String(date || "").match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) {
    return "";
  }
  return `${match[2]}/${match[3]}/${match[1]}`;
}

function formatLinkedValue(value, href) {
  if (!value && !href) {
    return "";
  }
  if (!href) {
    return escapeHtml(value);
  }
  const label = value || href;
  return `<a href="${escapeHtml(href)}" target="_blank" rel="noreferrer">${escapeHtml(label)}</a>`;
}

function formatFileSize(bytes) {
  if (!Number.isFinite(bytes)) {
    return "";
  }
  if (bytes < 1024 * 1024) {
    return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  }
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function formatNameDetails(reminder) {
  const lines = [];
  if (reminder.hebrewName) {
    const father = reminder.fatherName ? ` ben ${reminder.fatherName}` : "";
    lines.push(`${reminder.hebrewName}${father}`);
  }
  if (reminder.secularName && reminder.secularName !== reminder.personName) {
    lines.push(reminder.secularName);
  }
  return lines;
}

function reminderDetailHtml(reminder) {
  const rows = [
    ["Hebrew Name", reminder.hebrewName],
    ["Secular Name", reminder.secularName],
    ["Father's Name", reminder.fatherName],
    ["Family", reminder.familyName],
    ["Secular Date", formatSecularDate(reminder.reminderDate)],
    ["Hebrew Date", formatHebrewDate(reminder)],
    ["Notes", reminder.notes],
    ["Burial", formatLinkedValue(reminder.burialLocation, reminder.burialLink)],
  ].filter(([, value]) => value);

  return rows
    .map(([label, value]) => `
      <div class="detail-item">
        <dt>${escapeHtml(label)}</dt>
        <dd>${value}</dd>
      </div>
    `)
    .join("");
}

function renderReminderDetail(reminder) {
  reminderDetail.innerHTML = reminderDetailHtml(reminder);
}

function render(reminders) {
  const visibleReminders = selectedFamilyFilterId
    ? reminders.filter((reminder) => String(reminder.familyId || "") === selectedFamilyFilterId)
    : reminders;
  rows.innerHTML = "";

  if (!visibleReminders.length) {
    const row = document.createElement("tr");
    row.innerHTML = `<td class="empty" colspan="7">No reminders saved.</td>`;
    rows.append(row);
    return;
  }

  for (const reminder of visibleReminders) {
    const row = document.createElement("tr");
    row.className = "clickable-row";
    row.dataset.href = `/people/${reminder.id}`;
    const nameDetails = formatNameDetails(reminder)
      .map((line) => `<span>${escapeHtml(line)}</span>`)
      .join("");
    row.innerHTML = `
      <td>
        <strong>${escapeHtml(reminder.secularName || reminder.personName)}</strong>
        <span class="subtext">${nameDetails}</span>
      </td>
      <td>${escapeHtml(reminder.familyName || "")}</td>
      <td>${escapeHtml(formatSecularDate(reminder.reminderDate))}</td>
      <td>${escapeHtml(formatHebrewDate(reminder))}</td>
      <td>${escapeHtml(reminder.burialLocation || "")}</td>
      <td>${escapeHtml(reminder.notes || "")}</td>
      <td aria-hidden="true"></td>
    `;
    rows.append(row);
  }
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

async function loadReminders() {
  const payload = await request("/api/reminders");
  reminders = payload.reminders;
  render(reminders);
}

async function loadFamilies() {
  const payload = await request("/api/families");
  families = payload.families;
  renderFamilies();
}

async function loadEmailRecipients() {
  const payload = await request("/api/email-recipients");
  emailRecipients = payload.recipients;
  renderEmailRecipients();
}

function renderFamilies(selectedId = familySelect.value) {
  familySelect.innerHTML = `<option value=""></option>`;
  personFamilySelect.innerHTML = `<option value=""></option>`;
  emailFamilySelect.innerHTML = `<option value=""></option>`;
  for (const family of families) {
    const option = document.createElement("option");
    option.value = family.id;
    option.textContent = family.name;
    familySelect.append(option);
    personFamilySelect.append(option.cloneNode(true));
    emailFamilySelect.append(option.cloneNode(true));
  }
  familySelect.value = selectedId || "";
  if (currentPersonReminder) {
    personFamilySelect.value = currentPersonReminder.familyId || "";
  }
  renderFamilyFilterOptions();
}

function renderFamilyFilterOptions() {
  const selectedId = familyFilterSelect.value || selectedFamilyFilterId;
  familyFilterSelect.innerHTML = `<option value="">All families</option>`;
  for (const family of families) {
    const option = document.createElement("option");
    option.value = family.id;
    option.textContent = family.name;
    familyFilterSelect.append(option);
  }
  familyFilterSelect.value = selectedId;
  selectedFamilyFilterId = familyFilterSelect.value;
}

function renderEmailReminderOptions(selectedIds = []) {
  const selectedFamilyId = emailFamilySelect.value;
  const selectedIdSet = new Set(selectedIds.map(String));
  emailReminderSelect.innerHTML = "";

  for (const reminder of reminders) {
    if (selectedFamilyId && String(reminder.familyId || "") !== selectedFamilyId) {
      continue;
    }
    const option = document.createElement("option");
    option.value = reminder.id;
    option.textContent = reminderOptionLabel(reminder);
    option.selected = selectedIdSet.has(String(reminder.id));
    emailReminderSelect.append(option);
  }
}

function reminderOptionLabel(reminder) {
  const name = reminder.secularName || reminder.personName;
  const hebrew = reminder.hebrewName ? ` / ${reminder.hebrewName}` : "";
  const family = reminder.familyName ? ` (${reminder.familyName})` : "";
  return `${name}${hebrew}${family}`;
}

function emailRecipientNameLabel(reminder) {
  const name = reminder.secularName || reminder.personName;
  const hebrew = reminder.hebrewName ? ` / ${reminder.hebrewName}` : "";
  const family = reminder.familyName ? ` (${reminder.familyName})` : "";
  return `${name}${hebrew}${family}`;
}

function renderEmailRecipients() {
  emailRecipientRows.innerHTML = "";

  if (!emailRecipients.length) {
    const row = document.createElement("tr");
    row.innerHTML = `<td class="empty" colspan="4">No emails saved.</td>`;
    emailRecipientRows.append(row);
    return;
  }

  for (const recipient of emailRecipients) {
    const selectedNames = recipient.selectedReminders?.length
      ? recipient.selectedReminders.map(emailRecipientNameLabel).join(", ")
      : "All matching names";
    const row = document.createElement("tr");
    row.innerHTML = `
      <td><strong>${escapeHtml(recipient.email)}</strong></td>
      <td>${escapeHtml(recipient.familyName || "All families")}</td>
      <td>${escapeHtml(selectedNames)}</td>
      <td>
        <div class="row-actions">
          <button class="icon neutral" data-email-edit="${recipient.id}" title="Edit">Edit</button>
          <button class="icon" data-email-delete="${recipient.id}" title="Delete">x</button>
        </div>
      </td>
    `;
    emailRecipientRows.append(row);
  }
}

function dateContext(type) {
  if (type === "person") {
    return {
      secularDateInput: personSecularDateInput,
      hebrewDayInput: personHebrewDayInput,
      hebrewMonthSelect: personHebrewMonthSelect,
      hebrewYearSelect: personHebrewYearSelect,
      status: null,
    };
  }
  return {
    secularDateInput,
    hebrewDayInput,
    hebrewMonthSelect,
    hebrewYearSelect,
    status: dateConversionStatus,
  };
}

function populateConvertedDate(data, type = "modal") {
  const context = dateContext(type);
  isPopulatingDate = true;
  context.secularDateInput.value = data.secularDate || "";
  context.hebrewDayInput.value = data.hebrewDay || "";
  context.hebrewMonthSelect.value = data.hebrewMonth || "";
  ensureHebrewYearOption(data.hebrewYear, context.hebrewYearSelect);
  context.hebrewYearSelect.value = data.hebrewYear || "";
  isPopulatingDate = false;
}

async function loadHebrewYearOptions() {
  const today = new Date().toISOString().slice(0, 10);
  try {
    const data = await request("/api/date-conversions/gregorian-to-hebrew", {
      method: "POST",
      body: JSON.stringify({ secularDate: today }),
    });
    currentHebrewYear = data.hebrewYear;
  } catch {
    currentHebrewYear = 5786;
  }
  renderHebrewYearOptions(currentHebrewYear);
}

function renderHebrewYearOptions(startYear) {
  hebrewYearSelect.innerHTML = "";
  personHebrewYearSelect.innerHTML = "";
  for (let year = startYear; year >= startYear - 300; year -= 1) {
    const option = document.createElement("option");
    option.value = year;
    option.textContent = year;
    hebrewYearSelect.append(option);
    personHebrewYearSelect.append(option.cloneNode(true));
  }
}

function ensureHebrewYearOption(year, select = hebrewYearSelect) {
  if (!year || select.querySelector(`option[value="${year}"]`)) {
    return;
  }
  const option = document.createElement("option");
  option.value = year;
  option.textContent = year;
  select.prepend(option);
}

function setDateConversionStatus(text, tone = "", type = "modal") {
  const context = dateContext(type);
  if (!context.status) {
    return;
  }
  context.status.textContent = text;
  context.status.className = `inline-status ${tone}`;
}

async function convertFromSecularDate(type = "modal") {
  const context = dateContext(type);
  if (isPopulatingDate || !context.secularDateInput.value) return;
  const requestId = ++dateConversionRequestId;
  activeDateContext = type;
  setDateConversionStatus("Converting...", "", type);

  try {
    const data = await request("/api/date-conversions/gregorian-to-hebrew", {
      method: "POST",
      body: JSON.stringify({ secularDate: context.secularDateInput.value }),
    });
    if (requestId === dateConversionRequestId && activeDateContext === type) {
      populateConvertedDate(data, type);
      setDateConversionStatus("Matched", "success", type);
    }
  } catch (error) {
    if (requestId === dateConversionRequestId && activeDateContext === type) {
      setDateConversionStatus("", "", type);
      type === "person" ? setPersonMessage(error.message, "error") : setMessage(error.message, "error");
    }
  }
}

async function convertFromHebrewDate(type = "modal") {
  const context = dateContext(type);
  if (
    isPopulatingDate ||
    !context.hebrewDayInput.value ||
    !context.hebrewMonthSelect.value ||
    !context.hebrewYearSelect.value
  ) {
    return;
  }
  const requestId = ++dateConversionRequestId;
  activeDateContext = type;
  setDateConversionStatus("Converting...", "", type);

  try {
    const data = await request("/api/date-conversions/hebrew-to-gregorian", {
      method: "POST",
      body: JSON.stringify({
        hebrewDay: context.hebrewDayInput.value,
        hebrewMonth: context.hebrewMonthSelect.value,
        hebrewYear: context.hebrewYearSelect.value,
      }),
    });
    if (requestId === dateConversionRequestId && activeDateContext === type) {
      populateConvertedDate(data, type);
      setDateConversionStatus("Matched", "success", type);
    }
  } catch (error) {
    if (requestId === dateConversionRequestId && activeDateContext === type) {
      setDateConversionStatus("", "", type);
      type === "person" ? setPersonMessage(error.message, "error") : setMessage(error.message, "error");
    }
  }
}

function debounce(callback, delay) {
  let timeoutId;
  return () => {
    window.clearTimeout(timeoutId);
    timeoutId = window.setTimeout(callback, delay);
  };
}

function setReminderSaving(isSaving) {
  isSavingReminder = isSaving;
  saveReminderButton.disabled = isSaving;
  saveReminderButton.textContent = isSaving
    ? "Saving..."
    : editingReminderId
      ? "Save changes"
      : "Save reminder";
}

function setReminderFormMode(mode) {
  reminderFormMode = mode;
  const isViewMode = mode === "view";
  form.hidden = isViewMode;
  reminderDetail.hidden = !isViewMode;
  saveReminderButton.hidden = isViewMode;
  editReminderButton.hidden = !isViewMode || !editingReminderId;
  cancelButton.textContent = "Cancel";
  modalTitle.textContent = editingReminderId
    ? isViewMode
      ? "View Yahrzeit"
      : "Edit Yahrzeit"
    : "Add Yahrzeit";
  if (!isViewMode) {
    saveReminderButton.textContent = editingReminderId ? "Save changes" : "Save reminder";
  }
}

function openModal(reminder = null, mode = "edit") {
  editingReminderId = reminder?.id || null;
  currentReminder = reminder;
  if (reminder) {
    fillReminderForm(reminder);
    renderReminderDetail(reminder);
  } else {
    form.reset();
    reminderDetail.innerHTML = "";
    setDateConversionStatus("");
  }
  setReminderFormMode(mode);
  modalOverlay.hidden = false;
  syncModalBody();
  if (mode === "view") {
    editReminderButton.focus();
  } else {
    form.hebrewName.focus();
  }
}

function closeModal() {
  modalOverlay.hidden = true;
  syncModalBody();
  setReminderFormMode("edit");
  form.reset();
  setDateConversionStatus("");
  editingReminderId = null;
  currentReminder = null;
  setReminderSaving(false);
  addButton.focus();
}

function fillReminderForm(reminder) {
  form.hebrewName.value = reminder.hebrewName || "";
  form.secularName.value = reminder.secularName || "";
  form.fatherName.value = reminder.fatherName || "";
  familySelect.value = reminder.familyId || "";
  form.reminderDate.value = reminder.reminderDate || "";
  hebrewDayInput.value = reminder.hebrewDay || "";
  hebrewMonthSelect.value = reminder.hebrewMonth || "";
  ensureHebrewYearOption(reminder.hebrewYear);
  hebrewYearSelect.value = reminder.hebrewYear || "";
  form.notes.value = reminder.notes || "";
  form.burialLocation.value = reminder.burialLocation || "";
  form.burialLink.value = reminder.burialLink || "";
  setDateConversionStatus("");
}

function personIdFromPath() {
  const match = window.location.pathname.match(/^\/people\/(\d+)\/?$/);
  return match ? Number(match[1]) : null;
}

async function loadPersonPage(id) {
  setPersonMessage("");
  const payload = await request(`/api/reminders/${id}`);
  currentPersonReminder = payload.reminder;
  currentPersonAttachments = payload.attachments || [];
  renderPersonPage();
}

function renderPersonPage() {
  if (!currentPersonReminder) {
    return;
  }
  const displayName =
    currentPersonReminder.secularName ||
    currentPersonReminder.hebrewName ||
    currentPersonReminder.personName ||
    "Yahrzeit";
  personTitle.textContent = displayName;
  personSubtitle.textContent = [currentPersonReminder.familyName, formatHebrewDate(currentPersonReminder)]
    .filter(Boolean)
    .join(" / ");
  personDetail.innerHTML = reminderDetailHtml(currentPersonReminder);
  fillPersonForm(currentPersonReminder);
  renderAttachments(currentPersonAttachments);
  setPersonEditMode(false);
}

function fillPersonForm(reminder) {
  personForm.hebrewName.value = reminder.hebrewName || "";
  personForm.secularName.value = reminder.secularName || "";
  personForm.fatherName.value = reminder.fatherName || "";
  personFamilySelect.value = reminder.familyId || "";
  personForm.reminderDate.value = reminder.reminderDate || "";
  personHebrewDayInput.value = reminder.hebrewDay || "";
  personHebrewMonthSelect.value = reminder.hebrewMonth || "";
  ensureHebrewYearOption(reminder.hebrewYear, personHebrewYearSelect);
  personHebrewYearSelect.value = reminder.hebrewYear || "";
  personForm.notes.value = reminder.notes || "";
  personForm.burialLocation.value = reminder.burialLocation || "";
  personForm.burialLink.value = reminder.burialLink || "";
}

function setPersonEditMode(isEditing) {
  personDetail.hidden = isEditing;
  personForm.hidden = !isEditing;
  personEditButton.hidden = isEditing;
  personDeleteButton.hidden = isEditing;
  personCancelEditButton.hidden = !isEditing;
  personSaveButton.hidden = !isEditing;
  if (!isEditing) {
    setPersonSaving(false);
  }
}

async function deletePerson() {
  if (!currentPersonReminder) {
    return;
  }
  const displayName =
    currentPersonReminder.secularName ||
    currentPersonReminder.hebrewName ||
    currentPersonReminder.personName ||
    "this yahrzeit";
  if (!window.confirm(`Delete ${displayName}? This cannot be undone.`)) {
    return;
  }

  try {
    personDeleteButton.disabled = true;
    personDeleteButton.textContent = "Deleting...";
    await request(`/api/reminders/${currentPersonReminder.id}`, { method: "DELETE" });
    window.location.href = "/";
  } catch (error) {
    personDeleteButton.disabled = false;
    personDeleteButton.textContent = "Delete";
    setPersonMessage(error.message, "error");
  }
}

function setPersonSaving(isSaving) {
  isSavingPerson = isSaving;
  personSaveButton.disabled = isSaving;
  personSaveButton.textContent = isSaving ? "Saving..." : "Save";
}

function renderAttachments(attachments) {
  if (!attachments.length) {
    attachmentList.innerHTML = `<p class="empty-note">No files added yet.</p>`;
    return;
  }

  attachmentList.innerHTML = attachments
    .map((attachment) => {
      const isImage = attachment.contentType.startsWith("image/");
      const preview = isImage
        ? `<img src="${escapeHtml(attachment.url)}" alt="${escapeHtml(attachment.fileName)}">`
        : `<span class="file-badge">PDF</span>`;
      return `
        <article class="attachment-card">
          <button class="attachment-preview" type="button" data-attachment-id="${attachment.id}">
            ${preview}
          </button>
          <div class="attachment-meta">
            <button type="button" data-attachment-id="${attachment.id}">${escapeHtml(attachment.fileName)}</button>
            <span>${escapeHtml(formatFileSize(attachment.fileSize))}</span>
          </div>
        </article>
      `;
    })
    .join("");
}

function openAttachmentPreview(attachment) {
  attachmentPreviewTitle.textContent = attachment.fileName;
  if (attachment.contentType.startsWith("image/")) {
    attachmentPreviewBody.innerHTML = `
      <img class="attachment-full-image" src="${escapeHtml(attachment.url)}" alt="${escapeHtml(attachment.fileName)}">
    `;
  } else {
    attachmentPreviewBody.innerHTML = `
      <iframe class="attachment-pdf-frame" src="${escapeHtml(attachment.url)}" title="${escapeHtml(attachment.fileName)}"></iframe>
    `;
  }
  attachmentPreviewOverlay.hidden = false;
  syncModalBody();
  closeAttachmentPreviewButton.focus();
}

function closeAttachmentPreview() {
  attachmentPreviewOverlay.hidden = true;
  attachmentPreviewBody.innerHTML = "";
  syncModalBody();
}

async function savePerson() {
  if (!currentPersonReminder || isSavingPerson) {
    return;
  }
  const data = Object.fromEntries(new FormData(personForm).entries());
  data.annual = true;

  try {
    setPersonSaving(true);
    const payload = await request(`/api/reminders/${currentPersonReminder.id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
    currentPersonReminder = {
      ...payload.reminder,
      attachments: currentPersonAttachments,
    };
    setPersonMessage("Saved.", "success");
    renderPersonPage();
  } catch (error) {
    setPersonSaving(false);
    setPersonMessage(error.message, "error");
  }
}

async function uploadAttachment() {
  if (!currentPersonReminder || isUploadingAttachment) {
    return;
  }
  const file = attachmentInput.files[0];
  if (!file) {
    return;
  }
  const body = new FormData();
  body.append("file", file);

  try {
    isUploadingAttachment = true;
    addAttachmentButton.disabled = true;
    addAttachmentButton.textContent = "Uploading...";
    const response = await fetch(`/api/reminders/${currentPersonReminder.id}/attachments`, {
      method: "POST",
      body,
    });
    const payload = await response.json();
    if (!response.ok) {
      throw new Error(payload.error || "Upload failed.");
    }
    currentPersonAttachments = [payload.attachment, ...currentPersonAttachments];
    renderAttachments(currentPersonAttachments);
    setPersonMessage("File added.", "success");
  } catch (error) {
    setPersonMessage(error.message, "error");
  } finally {
    isUploadingAttachment = false;
    addAttachmentButton.disabled = false;
    addAttachmentButton.textContent = "Add File";
    attachmentInput.value = "";
  }
}

function openFamilyModal(trigger = addFamilyButton) {
  lastFamilyTrigger = trigger;
  familyModalOverlay.hidden = false;
  syncModalBody();
  familyForm.name.focus();
}

function closeFamilyModal() {
  familyModalOverlay.hidden = true;
  syncModalBody();
  familyForm.reset();
  lastFamilyTrigger.focus();
}

function syncModalBody() {
  document.body.classList.toggle(
    "modal-open",
    !modalOverlay.hidden ||
      !familyModalOverlay.hidden ||
      !emailModalOverlay.hidden ||
      !emailListModalOverlay.hidden ||
      !attachmentPreviewOverlay.hidden,
  );
}

function openEmailModal(recipient = null) {
  editingEmailRecipientId = recipient?.id || null;
  emailModalTitle.textContent = editingEmailRecipientId ? "Edit Email" : "Add Email";
  saveEmailButton.textContent = editingEmailRecipientId ? "Save changes" : "Save email";
  emailForm.reset();
  if (recipient) {
    emailForm.email.value = recipient.email || "";
    emailFamilySelect.value = recipient.familyId || "";
    renderEmailReminderOptions((recipient.selectedReminders || []).map((reminder) => reminder.id));
  } else {
    renderEmailReminderOptions();
  }
  emailModalOverlay.hidden = false;
  syncModalBody();
  emailForm.email.focus();
}

function closeEmailModal() {
  emailModalOverlay.hidden = true;
  syncModalBody();
  emailForm.reset();
  editingEmailRecipientId = null;
  saveEmailButton.disabled = false;
  saveEmailButton.textContent = "Save email";
  isSavingEmail = false;
  addEmailButton.focus();
}

async function openEmailListModal() {
  await loadEmailRecipients();
  emailListModalOverlay.hidden = false;
  syncModalBody();
  closeEmailListModalButton.focus();
}

function closeEmailListModal() {
  emailListModalOverlay.hidden = true;
  syncModalBody();
  viewEmailsButton.focus();
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (reminderFormMode === "view") return;
  if (isSavingReminder) return;
  const data = Object.fromEntries(new FormData(form).entries());
  data.annual = true;
  const isEditing = Boolean(editingReminderId);
  const path = isEditing ? `/api/reminders/${editingReminderId}` : "/api/reminders";

  try {
    setReminderSaving(true);
    await request(path, {
      method: isEditing ? "PUT" : "POST",
      body: JSON.stringify(data),
    });
    form.reset();
    closeModal();
    setMessage("Saved.", "success");
    await loadReminders();
  } catch (error) {
    setReminderSaving(false);
    setMessage(error.message, "error");
  }
});

familyForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const data = Object.fromEntries(new FormData(familyForm).entries());

  try {
    const payload = await request("/api/families", {
      method: "POST",
      body: JSON.stringify(data),
    });
    await loadFamilies();
    renderFamilies(String(payload.family.id));
    closeFamilyModal();
    setMessage("Family saved.", "success");
  } catch (error) {
    setMessage(error.message, "error");
  }
});

emailForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (isSavingEmail) return;

  const data = Object.fromEntries(new FormData(emailForm).entries());
  data.reminderIds = [...emailReminderSelect.selectedOptions].map((option) => option.value);
  const isEditing = Boolean(editingEmailRecipientId);
  const path = isEditing ? `/api/email-recipients/${editingEmailRecipientId}` : "/api/email-recipients";

  try {
    isSavingEmail = true;
    saveEmailButton.disabled = true;
    saveEmailButton.textContent = "Saving...";
    await request(path, {
      method: isEditing ? "PUT" : "POST",
      body: JSON.stringify(data),
    });
    closeEmailModal();
    await loadEmailRecipients();
    setMessage("Email saved.", "success");
  } catch (error) {
    isSavingEmail = false;
    saveEmailButton.disabled = false;
    saveEmailButton.textContent = "Save email";
    setMessage(error.message, "error");
  }
});

rows.addEventListener("click", async (event) => {
  const row = event.target.closest(".clickable-row");
  if (row?.dataset.href) {
    window.location.href = row.dataset.href;
  }
});

emailRecipientRows.addEventListener("click", async (event) => {
  const editButton = event.target.closest("[data-email-edit]");
  if (editButton) {
    const recipient = emailRecipients.find((item) => item.id === Number(editButton.dataset.emailEdit));
    if (recipient) {
      setMessage("");
      closeEmailListModal();
      openEmailModal(recipient);
    }
    return;
  }

  const deleteButton = event.target.closest("[data-email-delete]");
  if (!deleteButton) return;

  try {
    await request(`/api/email-recipients/${deleteButton.dataset.emailDelete}`, { method: "DELETE" });
    await loadEmailRecipients();
    setMessage("Email deleted.", "success");
  } catch (error) {
    setMessage(error.message, "error");
  }
});

addButton.addEventListener("click", () => {
  setMessage("");
  openModal();
});

editReminderButton.addEventListener("click", () => {
  if (currentReminder) {
    fillReminderForm(currentReminder);
  }
  setReminderFormMode("edit");
  form.hebrewName.focus();
});

addEmailButton.addEventListener("click", () => {
  setMessage("");
  openEmailModal();
});

viewEmailsButton.addEventListener("click", async () => {
  setMessage("");
  try {
    await openEmailListModal();
  } catch (error) {
    setMessage(error.message, "error");
  }
});

addFamilyButton.addEventListener("click", () => {
  setMessage("");
  openFamilyModal(addFamilyButton);
});

filterButton.addEventListener("click", () => {
  familyFilterLabel.hidden = !familyFilterLabel.hidden;
  if (!familyFilterLabel.hidden) {
    familyFilterSelect.focus();
  }
});

familyFilterSelect.addEventListener("change", () => {
  selectedFamilyFilterId = familyFilterSelect.value;
  render(reminders);
});

secularDateInput.addEventListener("change", () => convertFromSecularDate("modal"));

const debouncedHebrewConversion = debounce(() => convertFromHebrewDate("modal"), 350);
hebrewDayInput.addEventListener("input", debouncedHebrewConversion);
hebrewMonthSelect.addEventListener("change", () => convertFromHebrewDate("modal"));
hebrewYearSelect.addEventListener("change", () => convertFromHebrewDate("modal"));

personSecularDateInput.addEventListener("change", () => convertFromSecularDate("person"));

const debouncedPersonHebrewConversion = debounce(() => convertFromHebrewDate("person"), 350);
personHebrewDayInput.addEventListener("input", debouncedPersonHebrewConversion);
personHebrewMonthSelect.addEventListener("change", () => convertFromHebrewDate("person"));
personHebrewYearSelect.addEventListener("change", () => convertFromHebrewDate("person"));

personEditButton.addEventListener("click", () => {
  fillPersonForm(currentPersonReminder);
  setPersonEditMode(true);
  personForm.hebrewName.focus();
});
personDeleteButton.addEventListener("click", deletePerson);
personCancelEditButton.addEventListener("click", () => {
  fillPersonForm(currentPersonReminder);
  setPersonEditMode(false);
});
personSaveButton.addEventListener("click", savePerson);
personForm.addEventListener("submit", (event) => {
  event.preventDefault();
  savePerson();
});
addAttachmentButton.addEventListener("click", () => attachmentInput.click());
attachmentInput.addEventListener("change", uploadAttachment);
attachmentList.addEventListener("click", (event) => {
  const trigger = event.target.closest("[data-attachment-id]");
  if (!trigger) {
    return;
  }
  const attachment = currentPersonAttachments.find((item) => item.id === Number(trigger.dataset.attachmentId));
  if (attachment) {
    openAttachmentPreview(attachment);
  }
});

closeModalButton.addEventListener("click", closeModal);
cancelButton.addEventListener("click", closeModal);
closeAttachmentPreviewButton.addEventListener("click", closeAttachmentPreview);
closeFamilyModalButton.addEventListener("click", closeFamilyModal);
cancelFamilyButton.addEventListener("click", closeFamilyModal);
closeEmailModalButton.addEventListener("click", closeEmailModal);
cancelEmailButton.addEventListener("click", closeEmailModal);
closeEmailListModalButton.addEventListener("click", closeEmailListModal);
emailFamilySelect.addEventListener("change", () => renderEmailReminderOptions());

modalOverlay.addEventListener("click", (event) => {
  if (event.target === modalOverlay) {
    closeModal();
  }
});

familyModalOverlay.addEventListener("click", (event) => {
  if (event.target === familyModalOverlay) {
    closeFamilyModal();
  }
});

emailModalOverlay.addEventListener("click", (event) => {
  if (event.target === emailModalOverlay) {
    closeEmailModal();
  }
});

emailListModalOverlay.addEventListener("click", (event) => {
  if (event.target === emailListModalOverlay) {
    closeEmailListModal();
  }
});

attachmentPreviewOverlay.addEventListener("click", (event) => {
  if (event.target === attachmentPreviewOverlay) {
    closeAttachmentPreview();
  }
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && !attachmentPreviewOverlay.hidden) {
    closeAttachmentPreview();
    return;
  }
  if (event.key === "Escape" && !modalOverlay.hidden) {
    closeModal();
    return;
  }
  if (event.key === "Escape" && !familyModalOverlay.hidden) {
    closeFamilyModal();
    return;
  }
  if (event.key === "Escape" && !emailModalOverlay.hidden) {
    closeEmailModal();
    return;
  }
  if (event.key === "Escape" && !emailListModalOverlay.hidden) {
    closeEmailListModal();
  }
});

async function init() {
  const personId = personIdFromPath();
  if (personId) {
    listPage.hidden = true;
    personPage.hidden = false;
    try {
      await Promise.all([loadHebrewYearOptions(), loadFamilies()]);
      await loadPersonPage(personId);
    } catch (error) {
      setPersonMessage(error.message, "error");
    }
    return;
  }

  listPage.hidden = false;
  personPage.hidden = true;
  try {
    await Promise.all([loadHebrewYearOptions(), loadFamilies(), loadReminders(), loadEmailRecipients()]);
  } catch (error) {
    setMessage(error.message, "error");
  }
}

init();
