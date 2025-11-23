let entries = JSON.parse(localStorage.getItem("daily_log")) || [];
let mapping = {};
let faultMapping = {}; // Equipment Type → Fault Type
let faultTypes = [];   // for Choices.js

// ----------------- Helper Functions -----------------
function to24Hour(timeStr) {
  if (!timeStr) return "00:00:00";
  let [time, modifier] = timeStr.split(' ');
  let [hours, minutes, seconds] = time.split(':');
  hours = parseInt(hours, 10);
  if (modifier === "PM" && hours !== 12) hours += 12;
  if (modifier === "AM" && hours === 12) hours = 0;
  seconds = seconds || "00";
  return `${hours.toString().padStart(2,'0')}:${minutes}:${seconds}`;
}

function resetDropdown(selectId, placeholder) {
  document.getElementById(selectId).innerHTML = `<option value="">${placeholder}</option>`;
}

function populateDropdown(selectId, items) {
  const select = document.getElementById(selectId);
  items.forEach(i => {
    const opt = document.createElement("option");
    opt.value = i; opt.text = i;
    select.appendChild(opt);
  });
}

function populateFaultType(equipmentType) {
  const faultTypeSelect = document.getElementById("faultTypeSelect");
  resetDropdown("faultTypeSelect", "Select Fault Type");
  let list = faultMapping[equipmentType] || faultMapping["Others"] || [];
  populateDropdown("faultTypeSelect", list);
}

// ----------------- Load Data -----------------
async function loadData() {
  mapping = await (await fetch("mappings.json")).json();
  faultMapping = await (await fetch("fault_mapping.json?v=" + Date.now())).json();

  // populate line dropdown
  resetDropdown("lineSelect", "Select Line");
  populateDropdown("lineSelect", Object.keys(mapping));

  // initialize Fault Type dropdown
  resetDropdown("faultTypeSelect", "Select Fault Type");
}

// ----------------- Cascading Dropdowns -----------------
document.getElementById("lineSelect").addEventListener("change", function() {
  const line = this.value;
  resetDropdown("areaSelect", "Select Area");
  resetDropdown("typeSelect", "Select Type");
  resetDropdown("equipSelect", "Select Equipment");
  resetDropdown("faultTypeSelect", "Select Fault Type");

  if (line && mapping[line]) populateDropdown("areaSelect", Object.keys(mapping[line]));
});

document.getElementById("areaSelect").addEventListener("change", function() {
  const line = document.getElementById("lineSelect").value;
  const area = this.value;
  resetDropdown("typeSelect", "Select Type");
  resetDropdown("equipSelect", "Select Equipment");
  resetDropdown("faultTypeSelect", "Select Fault Type");

  if (line && area && mapping[line][area]) populateDropdown("typeSelect", Object.keys(mapping[line][area]));
});

document.getElementById("typeSelect").addEventListener("change", function() {
  const line = document.getElementById("lineSelect").value;
  const area = document.getElementById("areaSelect").value;
  const type = this.value;
  const equipSelect = document.getElementById("equipSelect");

  resetDropdown("equipSelect", "Select Equipment");
  resetDropdown("faultTypeSelect", "Select Fault Type");

  if (line && area && type && mapping[line][area][type]) populateDropdown("equipSelect", mapping[line][area][type]);
  populateFaultType(type);
});

// ----------------- Close Popup on Outside Click -----------------
document.addEventListener("click", function(event) {
  const popup = document.getElementById("editDeletePopup");
  if (popup && !popup.contains(event.target)) popup.remove();
});

// ----------------- Save Entry -----------------
document.getElementById("saveBtn").addEventListener("click", function() {
  const rec = {
    Time: to24Hour(document.getElementById("timeInput").value),
    Date: document.getElementById("dateInput").value,
    Line: document.getElementById("lineSelect").value,
    Area: document.getElementById("areaSelect").value,
    Equipment_Type: document.getElementById("typeSelect").value,
    Equipment: document.getElementById("equipSelect").value,
    Problem_Description: document.getElementById("faultInput").value,
    Action_Type: document.getElementById("actionTypeSelect").value,
    Action: document.getElementById("actionInput").value,
    Type_of_Fault: document.getElementById("faultTypeSelect").value,
    Job_Type: document.getElementById("jobTypeSelect").value,
    EST: document.getElementById("estInput").value,
    LOTO_Applied: document.getElementById("lotoSelect").value
  };

  for (let key in rec) if (!rec[key]) { alert(`Please fill/select ${key}`); return; }

  entries.push(rec);
  localStorage.setItem("daily_log", JSON.stringify(entries));
  document.getElementById("status").innerText = `Saved (${entries.length} rows)`;

  // reset form
  document.getElementById("logForm").reset();
  ["actionTypeSelect","jobTypeSelect","lotoSelect"].forEach(id => document.getElementById(id).selectedIndex = 1);
  ["areaSelect","typeSelect","equipSelect"].forEach(id => resetDropdown(id, `Select ${id.replace("Select","")}`));

  // reset date & time
  const now = new Date();
  document.getElementById("dateInput").value = now.toISOString().split("T")[0];
  document.getElementById("timeInput").value = now.toTimeString().slice(0,8);

  // reset Choices.js
  if (typeof faultTypeChoices !== "undefined") {
    faultTypeChoices.clearStore();
    faultTypeChoices.setChoices(faultTypes.map(ft => ({ value: ft, label: ft })), 'value', 'label', true);
  }
});

// ----------------- Edit/Delete Popup -----------------
function showEditDeletePopup(rowIndex, event) {
  const existing = document.getElementById("editDeletePopup");
  if (existing) existing.remove();

  const popup = document.createElement("div");
  popup.id = "editDeletePopup";
  Object.assign(popup.style, {
    position: "fixed",
    top: event.clientY + "px",
    left: event.clientX + "px",
    background: "#fff",
    border: "1px solid #48426D",
    padding: "10px 15px",
    borderRadius: "8px",
    boxShadow: "0 4px 8px rgba(0,0,0,0.2)",
    zIndex: 1000,
    display: "flex",
    flexDirection: "column",
    gap: "10px"
  });

  popup.innerHTML = `
    <p>Choose an action:</p>
    <div style="display:flex; gap:10px;">
      <button id="editEntry" style="flex:1;background:#48426D;color:white;padding:5px 10px;border:none;border-radius:5px;">Edit</button>
      <button id="deleteEntry" style="flex:1;background:red;color:white;padding:5px 10px;border:none;border-radius:5px;">Delete</button>
      <button id="cancelPopup" style="flex:1;background:#fff;color:black;padding:5px 10px;border:1px solid #48426D;border-radius:5px;">Cancel</button>
    </div>
  `;
  document.body.appendChild(popup);

  // position inside viewport
  const rect = popup.getBoundingClientRect();
  let left = event.clientX, top = event.clientY;
  if (left + rect.width > window.innerWidth) left = Math.max(10, event.clientX - rect.width - 10);
  if (top + rect.height > window.innerHeight) top = Math.max(10, event.clientY - rect.height - 10);
  popup.style.left = left + "px";
  popup.style.top = top + "px";

  const editBtn = document.getElementById("editEntry");
  const deleteBtn = document.getElementById("deleteEntry");
  const cancelBtn = document.getElementById("cancelPopup");

  // Hover effects
  editBtn.onmouseenter = () => editBtn.style.background = "#F0C383";
  editBtn.onmouseleave = () => editBtn.style.background = "#48426D";
  deleteBtn.onmouseenter = () => deleteBtn.style.background = "red";
  deleteBtn.onmouseleave = () => deleteBtn.style.background = "#48426D";
  cancelBtn.onmouseenter = () => { cancelBtn.style.background = "#F0C383"; cancelBtn.style.color = "white"; };
  cancelBtn.onmouseleave = () => { cancelBtn.style.background = "#48426D"; cancelBtn.style.color = "white"; };

  // Edit
  editBtn.onclick = () => {
    const rec = entries[rowIndex];
    document.getElementById("timeInput").value = rec.Time;
    document.getElementById("dateInput").value = rec.Date;
    document.getElementById("lineSelect").value = rec.Line;

    resetDropdown("areaSelect", "Select Area");
    populateDropdown("areaSelect", Object.keys(mapping[rec.Line] || {}));
    document.getElementById("areaSelect").value = rec.Area;

    resetDropdown("typeSelect", "Select Type");
    populateDropdown("typeSelect", Object.keys(mapping[rec.Line][rec.Area] || {}));
    document.getElementById("typeSelect").value = rec.Equipment_Type;

    resetDropdown("equipSelect", "Select Equipment");
    populateDropdown("equipSelect", mapping[rec.Line][rec.Area][rec.Equipment_Type] || []);
    document.getElementById("equipSelect").value = rec.Equipment;

    document.getElementById("faultInput").value = rec.Problem_Description;
    document.getElementById("actionTypeSelect").value = rec.Action_Type;
    document.getElementById("actionInput").value = rec.Action;

    populateFaultType(rec.Equipment_Type);
    document.getElementById("faultTypeSelect").value = rec.Type_of_Fault;

    document.getElementById("jobTypeSelect").value = rec.Job_Type;
    document.getElementById("estInput").value = rec.EST;
    document.getElementById("lotoSelect").value = rec.LOTO_Applied;

    popup.remove();
    entries.splice(rowIndex, 1);
    localStorage.setItem("daily_log", JSON.stringify(entries));
    document.getElementById("previewModal").style.display = "none";
  };

  // Delete
  deleteBtn.onclick = () => {
    entries.splice(rowIndex, 1);
    localStorage.setItem("daily_log", JSON.stringify(entries));
    popup.remove();
    document.getElementById("previewBtn").click();
  };

  // Cancel
  cancelBtn.onclick = () => popup.remove();
}

// ----------------- Preview Table -----------------
document.getElementById("previewBtn").addEventListener("click", function() {
  const modal = document.getElementById("previewModal");
  const table = document.getElementById("previewTable");
  table.innerHTML = "";

  if (!entries.length) { alert("No entries to preview"); return; }

  const headers = Object.keys(entries[0]);
  const trHead = document.createElement("tr");
  headers.forEach(h => { const th = document.createElement("th"); th.innerText = h; trHead.appendChild(th); });
  table.appendChild(trHead);

  const frag = document.createDocumentFragment();
  entries.forEach((r, idx) => {
    const tr = document.createElement("tr");
    headers.forEach(h => { const td = document.createElement("td"); td.innerText = r[h]; tr.appendChild(td); });

    // Right-click / long-press
    tr.addEventListener("contextmenu", e => { e.preventDefault(); showEditDeletePopup(idx, e); });
    let pressTimer;
    tr.addEventListener("touchstart", e => { pressTimer = setTimeout(() => showEditDeletePopup(idx, e.touches[0]), 700); });
    tr.addEventListener("touchend", () => clearTimeout(pressTimer));

    frag.appendChild(tr);
  });
  table.appendChild(frag);

  modal.style.display = "block";
});

document.getElementById("closePreview").addEventListener("click", () => {
  document.getElementById("previewModal").style.display = "none";
  const popup = document.getElementById("editDeletePopup");
  if (popup) popup.remove();
});

// ----------------- Export CSV -----------------
document.getElementById("exportBtn").addEventListener("click", () => {
  if (!entries.length) { alert("No entries to export"); return; }

  const csvContent = [Object.keys(entries[0]).join(","), ...entries.map(e => Object.values(e).join(","))].join("\n");
  const blob = new Blob([csvContent], { type: "text/csv" });
  const url = URL.createObjectURL(blob);

  const today = new Date();
  const filename = `LogForm_${String(today.getDate()).padStart(2,'0')}-${String(today.getMonth()+1).padStart(2,'0')}-${today.getFullYear()}.csv`;

  const a = document.createElement("a");
  a.href = url; a.download = filename; document.body.appendChild(a); a.click(); document.body.removeChild(a);

  entries = []; localStorage.removeItem("daily_log");
  document.getElementById("status").innerText = `Exported (${filename}) & cleared entries`;
});

// ----------------- Clear Entries -----------------
document.getElementById("clearBtn").addEventListener("click", () => {
  const popup = document.getElementById("clearConfirmPopup");
  popup.style.display = "block";

  document.getElementById("confirmClear").onclick = () => { entries = []; localStorage.removeItem("daily_log"); document.getElementById("status").innerText = "Cleared"; popup.style.display = "none"; };
  document.getElementById("cancelClear").onclick = () => { popup.style.display = "none"; };
});

// ----------------- Set Default Date & Time -----------------
window.onload = () => {
  const now = new Date();
  document.getElementById("dateInput").value = now.toISOString().split("T")[0];
  document.getElementById("timeInput").value = now.toTimeString().slice(0,8);

  loadData().then(() => { ["actionTypeSelect","jobTypeSelect"].forEach(id => document.getElementById(id).selectedIndex = 1); });
};
