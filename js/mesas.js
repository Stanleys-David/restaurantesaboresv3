import { getAllAreas, saveArea, deleteArea, getAllTables, saveTable, deleteTable, subscribeToTables, updateTableStatus } from "./firebase.js"

let areas = []
let tables = []
let selectedArea = "all"

const escapeHtml = (value) => String(value).replace(/[&<>'"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[char])
const statusLabels = { available: "Libre", libre: "Libre", occupied: "Ocupada", reserved: "Reservada", cuenta_solicitada: "Cuenta solicitada", en_limpieza: "En limpieza" }
const areaLabel = (id) => areas.find((area) => area.id === id)?.name || "Sin área"

function render() {
  const areaFilter = document.getElementById("areaFilter")
  const areaSelect = document.getElementById("tableArea")
  const areasList = document.getElementById("areasList")
  const grid = document.getElementById("tablesGrid")
  if (!areaFilter || !grid) return
  areaFilter.innerHTML = `<option value="all">Todas las áreas</option>${areas.map((area) => `<option value="${area.id}">${escapeHtml(area.name)}</option>`).join("")}`
  areaFilter.value = selectedArea
  areaSelect.innerHTML = `<option value="">Área</option>${areas.map((area) => `<option value="${area.id}">${escapeHtml(area.name)}</option>`).join("")}`
  areasList.innerHTML = areas.length ? areas.map((area) => `<span class="area-chip">${escapeHtml(area.name)} <button data-delete-area="${area.id}" aria-label="Eliminar ${escapeHtml(area.name)}">×</button></span>`).join("") : `<span class="empty-note">Aún no hay áreas.</span>`
  const statusFilter = document.getElementById("tableStatusFilter")?.value || "all"
  const visible = tables.filter((table) => (selectedArea === "all" || table.areaId === selectedArea) && (statusFilter === "all" || (table.status || "available") === statusFilter))
  grid.innerHTML = visible.length ? visible.map((table) => `<article class="table-card ${table.status || "available"}"><div class="table-icon"><i class="fas fa-chair"></i></div><div><h3>${escapeHtml(table.name)}</h3><p>${escapeHtml(areaLabel(table.areaId))} · ${table.seats} puestos</p></div><span class="table-status">${statusLabels[table.status || "available"] || "Libre"}</span><select class="table-status-select" data-status-table="${table.id}" aria-label="Estado de ${escapeHtml(table.name)}">${Object.entries(statusLabels).filter(([key]) => !["available", "libre"].includes(key) || (table.status || "available") === key).map(([key, label]) => `<option value="${key}" ${(table.status || "available") === key ? "selected" : ""}>${label}</option>`).join("")}</select><button class="table-delete" data-delete-table="${table.id}" aria-label="Eliminar ${escapeHtml(table.name)}"><i class="fas fa-trash"></i></button></article>`).join("") : `<div class="empty-tables"><i class="fas fa-chair"></i><p>No hay mesas en esta área.</p></div>`
}

async function load() {
  const [areaResult, tableResult] = await Promise.all([getAllAreas(), getAllTables()])
  areas = areaResult.areas || []
  tables = tableResult.tables || []
  render()
}

document.addEventListener("DOMContentLoaded", async () => {
  await load()
  document.getElementById("areaFilter")?.addEventListener("change", (event) => { selectedArea = event.target.value; render() })
  document.getElementById("tableStatusFilter")?.addEventListener("change", render)
  document.getElementById("refreshTables")?.addEventListener("click", load)
  document.getElementById("areaForm")?.addEventListener("submit", async (event) => { event.preventDefault(); const input = document.getElementById("areaName"); if (input.value.trim()) { await saveArea({ name: input.value.trim() }); input.value = ""; await load() } })
  document.getElementById("tableForm")?.addEventListener("submit", async (event) => { event.preventDefault(); const name = document.getElementById("tableName"); const area = document.getElementById("tableArea"); if (name.value.trim() && area.value) { await saveTable({ name: name.value.trim(), seats: Number(document.getElementById("tableSeats").value), areaId: area.value }); name.value = ""; await load() } })
  document.addEventListener("change", async (event) => { const statusTable = event.target.closest("[data-status-table]"); if (statusTable) await updateTableStatus(statusTable.dataset.statusTable, statusTable.value) })
  document.addEventListener("click", async (event) => { const areaButton = event.target.closest("[data-delete-area]"); const tableButton = event.target.closest("[data-delete-table]"); if (areaButton && confirm("¿Eliminar esta área?")) { await deleteArea(areaButton.dataset.deleteArea); await load() } if (tableButton && confirm("¿Eliminar esta mesa?")) { await deleteTable(tableButton.dataset.deleteTable); await load() } })
  subscribeToTables((nextTables) => { tables = nextTables; render() })
})
