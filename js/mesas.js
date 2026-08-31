import { getAllAreas, saveArea, deleteArea, getAllTables, saveTable, deleteTable, subscribeToTables, getAllOrders } from "./firebase.js"

let areas = []
let tables = []
let orders = []
let selectedArea = "all"
let draggedTable = null
let didDrag = false

const escapeHtml = (value) => String(value ?? "").replace(/[&<>'"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[char])
const statusLabels = { available: "Disponible", libre: "Disponible", occupied: "Ocupada", reserved: "Reservada", cuenta_solicitada: "Cuenta solicitada", en_limpieza: "En limpieza" }
const statusClass = (status) => status === "reserved" ? "reserved" : status === "occupied" ? "occupied" : status === "available" || status === "libre" ? "available" : "other"
const areaLabel = (id) => areas.find((area) => area.id === id)?.name || "Sin área"

function visibleTables() {
  const status = document.getElementById("tableStatusFilter")?.value || "all"
  return tables.filter((table) => (selectedArea === "all" || table.areaId === selectedArea) && (status === "all" || (table.status || "available") === status))
}

function render() {
  const areaFilter = document.getElementById("areaFilter")
  const areaSelect = document.getElementById("tableArea")
  const areasList = document.getElementById("areasList")
  const plan = document.getElementById("tablesPlan")
  if (!areaFilter || !areaSelect || !areasList || !plan) return
  areaFilter.innerHTML = `<option value="all">Todas las áreas</option>${areas.map((area) => `<option value="${area.id}">${escapeHtml(area.name)}</option>`).join("")}`
  areaFilter.value = selectedArea
  areaSelect.innerHTML = `<option value="">Área</option>${areas.map((area) => `<option value="${area.id}">${escapeHtml(area.name)}</option>`).join("")}`
  areasList.innerHTML = areas.length ? areas.map((area) => `<span class="area-chip">${escapeHtml(area.name)} <button data-delete-area="${area.id}" aria-label="Eliminar ${escapeHtml(area.name)}">×</button></span>`).join("") : '<span class="empty-note">Aún no hay áreas.</span>'
  const visible = visibleTables()
  plan.innerHTML = visible.length ? visible.map((table, index) => {
    const position = table.position || { x: 8 + (index % 4) * 23, y: 10 + Math.floor(index / 4) * 28 }
    return `<button class="plan-table ${statusClass(table.status || "available")}" data-table-id="${table.id}" style="left:${Math.max(0, Math.min(88, position.x))}%;top:${Math.max(0, Math.min(85, position.y))}%" title="${escapeHtml(table.name)}"><strong>${escapeHtml(table.name)}</strong><small>${table.seats || 0} puestos</small></button>`
  }).join("") : '<div class="empty-tables"><i class="fas fa-chair"></i><p>No hay mesas con estos filtros.</p></div>'
}

async function load() {
  const [areaResult, tableResult, orderResult] = await Promise.all([getAllAreas(), getAllTables(), getAllOrders()])
  areas = areaResult.areas || []
  tables = tableResult.tables || []
  orders = orderResult.orders || []
  render()
}

function activeOrderFor(table) {
  return orders.find((order) => (table.activeOrderId && (order.firebaseId === table.activeOrderId || order.id === table.activeOrderId)) || order.details?.tableId === table.id || order.tableId === table.id)
}

function openTableDetail(tableId) {
  if (didDrag) return
  const table = tables.find((item) => item.id === tableId)
  if (!table) return
  const activeOrder = activeOrderFor(table)
  const modal = document.createElement("div")
  modal.className = "modal"
  modal.style.display = "flex"
  modal.innerHTML = `<div class="modal-content table-detail"><button class="close" type="button">&times;</button><h2>${escapeHtml(table.name)}</h2><p><strong>Área:</strong> ${escapeHtml(areaLabel(table.areaId))}</p><p><strong>Estado:</strong> ${escapeHtml(statusLabels[table.status || "available"] || "Disponible")}</p><p><strong>Capacidad:</strong> ${table.seats || 0} puestos</p>${table.reservationName ? `<p><strong>Reserva:</strong> ${escapeHtml(table.reservationName)}${table.reservationPhone ? ` · ${escapeHtml(table.reservationPhone)}` : ""}${table.reservationDate ? ` · ${escapeHtml(table.reservationDate)}` : ""}</p>` : ""}${activeOrder ? `<p><strong>Pedido activo:</strong> #${escapeHtml(activeOrder.id || activeOrder.firebaseId)} · ${escapeHtml(activeOrder.customerName || "Cliente")}</p>` : ""}<div class="form-buttons"><button class="btn btn-primary" data-reserve>Crear/editar reserva</button><button class="btn btn-outline" data-edit>Editar mesa</button><button class="btn btn-outline" data-delete>Eliminar mesa</button></div></div>`
  document.body.appendChild(modal)
  modal.querySelector(".close").addEventListener("click", () => modal.remove())
  modal.addEventListener("click", (event) => { if (event.target === modal) modal.remove() })
  modal.querySelector("[data-reserve]").addEventListener("click", () => { modal.remove(); openReservationEditor(table) })
  modal.querySelector("[data-edit]").addEventListener("click", () => { modal.remove(); openTableEditor(table) })
  modal.querySelector("[data-delete]").addEventListener("click", async () => { if (confirm(`¿Eliminar ${table.name}?`)) { await deleteTable(table.id); modal.remove(); await load() } })
}

function openReservationEditor(table) {
  const modal = document.createElement("div")
  modal.className = "modal"; modal.style.display = "flex"
  modal.innerHTML = `<div class="modal-content table-detail"><button class="close" type="button">&times;</button><h2>Reserva · ${escapeHtml(table.name)}</h2><form id="reservationForm" class="user-form"><input id="reservationName" required placeholder="Nombre del cliente" value="${escapeHtml(table.reservationName)}"><input id="reservationPhone" placeholder="Teléfono" value="${escapeHtml(table.reservationPhone)}"><input id="reservationDate" type="datetime-local" value="${escapeHtml(table.reservationDate)}"><div class="form-buttons"><button class="btn btn-primary">Guardar reserva</button><button type="button" class="btn btn-outline" data-cancel>Cancelar</button></div></form></div>`
  document.body.appendChild(modal)
  modal.querySelectorAll(".close, [data-cancel]").forEach((button) => button.addEventListener("click", () => modal.remove()))
  modal.querySelector("form").addEventListener("submit", async (event) => { event.preventDefault(); await saveTable({ ...table, status: "reserved", reservationName: document.getElementById("reservationName").value.trim(), reservationPhone: document.getElementById("reservationPhone").value.trim(), reservationDate: document.getElementById("reservationDate").value }, table.id); modal.remove(); await load() })
}

function openTableEditor(table) {
  const modal = document.createElement("div")
  modal.className = "modal"; modal.style.display = "flex"
  modal.innerHTML = `<div class="modal-content table-detail"><button class="close" type="button">&times;</button><h2>Editar mesa</h2><form id="tableEditor" class="user-form"><input id="editTableName" required value="${escapeHtml(table.name)}"><input id="editTableSeats" type="number" min="1" max="30" required value="${table.seats || 1}"><select id="editTableArea">${areas.map((area) => `<option value="${area.id}" ${area.id === table.areaId ? "selected" : ""}>${escapeHtml(area.name)}</option>`).join("")}</select><select id="editTableStatus">${Object.entries(statusLabels).filter(([key]) => key !== "libre").map(([key, label]) => `<option value="${key}" ${(table.status || "available") === key ? "selected" : ""}>${label}</option>`).join("")}</select><div class="form-buttons"><button class="btn btn-primary">Guardar</button><button type="button" class="btn btn-outline" data-cancel>Cancelar</button></div></form></div>`
  document.body.appendChild(modal)
  modal.querySelectorAll(".close, [data-cancel]").forEach((button) => button.addEventListener("click", () => modal.remove()))
  modal.querySelector("form").addEventListener("submit", async (event) => { event.preventDefault(); await saveTable({ ...table, name: document.getElementById("editTableName").value.trim(), seats: Number(document.getElementById("editTableSeats").value), areaId: document.getElementById("editTableArea").value, status: document.getElementById("editTableStatus").value }, table.id); modal.remove(); await load() })
}

function startDrag(event) {
  const node = event.target.closest("[data-table-id]")
  if (!node) return
  draggedTable = tables.find((item) => item.id === node.dataset.tableId)
  didDrag = false
  node.setPointerCapture?.(event.pointerId)
}

async function moveDrag(event) {
  if (!draggedTable) return
  const plan = document.getElementById("tablesPlan")
  const rect = plan.getBoundingClientRect()
  const x = Math.max(0, Math.min(88, ((event.clientX - rect.left) / rect.width) * 100))
  const y = Math.max(0, Math.min(85, ((event.clientY - rect.top) / rect.height) * 100))
  const node = plan.querySelector(`[data-table-id="${draggedTable.id}"]`)
  if (node) { node.style.left = `${x}%`; node.style.top = `${y}%` }
  draggedTable.position = { x, y }; didDrag = true
}

async function endDrag() {
  if (draggedTable && didDrag) await saveTable(draggedTable, draggedTable.id)
  draggedTable = null
  window.setTimeout(() => { didDrag = false }, 0)
}

document.addEventListener("DOMContentLoaded", async () => {
  await load()
  document.getElementById("areaFilter")?.addEventListener("change", (event) => { selectedArea = event.target.value; render() })
  document.getElementById("tableStatusFilter")?.addEventListener("change", render)
  document.getElementById("refreshTables")?.addEventListener("click", load)
  document.getElementById("areaForm")?.addEventListener("submit", async (event) => { event.preventDefault(); const input = document.getElementById("areaName"); if (input.value.trim()) { await saveArea({ name: input.value.trim() }); input.value = ""; await load() } })
  document.getElementById("tableForm")?.addEventListener("submit", async (event) => { event.preventDefault(); const name = document.getElementById("tableName"); const area = document.getElementById("tableArea"); if (name.value.trim() && area.value) { await saveTable({ name: name.value.trim(), seats: Number(document.getElementById("tableSeats").value), areaId: area.value, position: { x: 10 + (tables.length % 4) * 22, y: 10 + (Math.floor(tables.length / 4) % 3) * 27 } }); name.value = ""; await load() } })
  document.addEventListener("click", async (event) => { const areaButton = event.target.closest("[data-delete-area]"); const tableNode = event.target.closest("[data-table-id]"); if (areaButton && confirm("¿Eliminar esta área?")) { await deleteArea(areaButton.dataset.deleteArea); await load() } else if (tableNode) openTableDetail(tableNode.dataset.tableId) })
  const plan = document.getElementById("tablesPlan")
  plan?.addEventListener("pointerdown", startDrag); plan?.addEventListener("pointermove", moveDrag); plan?.addEventListener("pointerup", endDrag); plan?.addEventListener("pointercancel", endDrag)
  subscribeToTables((nextTables) => { tables = nextTables; render() })
})