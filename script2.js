let entries = JSON.parse(localStorage.getItem("daily_log")) || [];
let mapping = {};
let faultMapping = {};  // NEW (mapped faults)

// ----------------------
// Load JSON files
// ----------------------
async function loadData() {
  mapping = await (await fetch("mappings.json")).json();
  faultMapping = await (await fetch("fault_mapping.json?v=" + Date.now())).json();  // NEW

  // populate line dropdown
  const lineSelect = document.getElementById("lineSelect");
  lineSelect.innerHTML = `<option value="">Select Line</option>`;
  Object.keys(mapping).forEach(l => {
    const opt = document.createElement("option");
    opt.value = l; opt.text = l;
    lineSelect.appendChild(opt);
  });

  // fault type dropdown initially empty
  document.getElementById("faultTypeSelect").innerHTML =
    `<option value="">Select Fault Type</option>`;
}

// ----------------------
// Cascading Dropdowns
// ----------------------

// LINE → AREA
document.getElementById("lineSelect").addEventListener("change", function(){
  const line = this.value;

  const areaSelect = document.getElementById("areaSelect");
  areaSelect.innerHTML = `<option value="">Select Area</option>`;

  if(line && mapping[line]){
    Object.keys(mapping[line]).forEach(a=>{
      const opt = document.createElement("option");
      opt.value = a; opt.text = a;
      areaSelect.appendChild(opt);
    });
  }

  document.getElementById("typeSelect").innerHTML = `<option value="">Select Type</option>`;
  document.getElementById("equipSelect").innerHTML = `<option value="">Select Equipment</option>`;
  document.getElementById("faultTypeSelect").innerHTML = `<option value="">Select Fault Type</option>`;
});

// AREA → EQUIPMENT TYPE
document.getElementById("areaSelect").addEventListener("change", function(){
  const line = document.getElementById("lineSelect").value;
  const area = this.value;

  const typeSelect = document.getElementById("typeSelect");
  typeSelect.innerHTML = `<option value="">Select Type</option>`;

  if(line && area && mapping[line][area]){
    Object.keys(mapping[line][area]).forEach(t=>{
      const opt = document.createElement("option");
      opt.value = t; opt.text = t;
      typeSelect.appendChild(opt);
    });
  }

  document.getElementById("equipSelect").innerHTML = `<option value="">Select Equipment</option>`;
  document.getElementById("faultTypeSelect").innerHTML = `<option value="">Select Fault Type</option>`;
});

// EQUIPMENT TYPE → EQUIPMENTS + FAULT TYPES
document.getElementById("typeSelect").addEventListener("change", function(){
  const line = document.getElementById("lineSelect").value;
  const area = document.getElementById("areaSelect").value;
  const type = this.value;

  // populate equipment list
  const equipSelect = document.getElementById("equipSelect");
  equipSelect.innerHTML = `<option value="">Select Equipment</option>`;
  if(line && area && type && mapping[line][area][type]){
    mapping[line][area][type].forEach(e=>{
      const opt = document.createElement("option");
      opt.value = e; opt.text = e;
      equipSelect.appendChild(opt);
    });
  }

  // populate fault type list (NEW)
  const faultSelect = document.getElementById("faultTypeSelect");
  faultSelect.innerHTML = `<option value="">Select Fault Type</option>`;
  if(type && faultMapping[type]){
    faultMapping[type].forEach(f=>{
      const opt = document.createElement("option");
      opt.value = f; opt.text = f;
      faultSelect.appendChild(opt);
    });
  }
});

// ----------------------
// SAVE ENTRY
// ----------------------
document.getElementById("saveBtn").addEventListener("click", function(){
  const rec = {
    Time: document.getElementById("timeInput").value,
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

  // validation
  for(let key in rec){
    if(!rec[key]){
      alert(`Please fill/select ${key}`);
      return;
    }
  }

  entries.push(rec);
  localStorage.setItem("daily_log", JSON.stringify(entries));
  document.getElementById("status").innerText = `Saved (${entries.length} rows)`;

  // reset form
  document.getElementById("logForm").reset();
  document.getElementById("lineSelect").selectedIndex = 0;
  document.getElementById("areaSelect").innerHTML = `<option value="">Select Area</option>`;
  document.getElementById("typeSelect").innerHTML = `<option value="">Select Type</option>`;
  document.getElementById("equipSelect").innerHTML = `<option value="">Select Equipment</option>`;
  document.getElementById("faultTypeSelect").innerHTML = `<option value="">Select Fault Type</option>`;
  document.getElementById("jobTypeSelect").selectedIndex = 0;
  document.getElementById("actionTypeSelect").selectedIndex = 0;
  document.getElementById("lotoSelect").selectedIndex = 1;

  const now = new Date();
  document.getElementById("dateInput").valueAsDate = now;
  document.getElementById("timeInput").value = now.toTimeString().slice(0,8);
});

// ----------------------
// PREVIEW TABLE
// ----------------------
document.getElementById("previewBtn").addEventListener("click", function(){
  const modal = document.getElementById("previewModal");
  const table = document.getElementById("previewTable");
  table.innerHTML = "";

  if(entries.length === 0){
    alert("No entries to preview");
    return;
  }

  const headers = Object.keys(entries[0]);
  const tr = document.createElement("tr");
  headers.forEach(h=>{
    const th = document.createElement("th"); th.innerText = h; tr.appendChild(th);
  });
  table.appendChild(tr);

  entries.forEach(r=>{
    const tr = document.createElement("tr");
    headers.forEach(h=>{
      const td = document.createElement("td"); td.innerText = r[h]; tr.appendChild(td);
    });
    table.appendChild(tr);
  });

  modal.style.display = "block";
});

document.getElementById("closePreview").addEventListener("click", function(){
  document.getElementById("previewModal").style.display = "none";
});

// ----------------------
// EXPORT CSV
// ----------------------
document.getElementById("exportBtn").addEventListener("click", function(){
  if(entries.length === 0){
    alert("No entries to export");
    return;
  }

  const csvContent = [Object.keys(entries[0]).join(",")]
      .concat(entries.map(e => Object.values(e).join(",")))
      .join("\n");

  const blob = new Blob([csvContent], {type: "text/csv"});
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = "daily_log.csv";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);

  entries = [];
  localStorage.removeItem("daily_log");
  document.getElementById("status").innerText = "Exported & cleared entries";
});

// ----------------------
// CLEAR ALL BUTTON
// ----------------------
document.getElementById("clearBtn").addEventListener("click", function(){
  if(confirm("Clear all entries?")){
    entries = [];
    localStorage.removeItem("daily_log");
    document.getElementById("status").innerText = "Cleared";
  }
});

// ----------------------
// ON LOAD
// ----------------------
window.onload = function(){
  const now = new Date();
  document.getElementById("dateInput").valueAsDate = now;
  document.getElementById("timeInput").value = now.toTimeString().slice(0,8);
  loadData();
};
