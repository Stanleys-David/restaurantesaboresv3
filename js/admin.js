import {
  getAllOrders,
  updateOrderStatus,
  saveProduct,
  getAllProducts,
  updateProduct,
  deleteProduct,
} from "./firebase.js"

const user = JSON.parse(localStorage.getItem("currentUser") || "null")

if (!user || user.role !== "admin") {
  alert("Acceso denegado. Solo los administradores pueden acceder a esta página.")
  window.location.href = "inicioSesion.html"
}

let products = []
let editingProduct = null
let notifications = []
let lastOrderCount = 0
let allOrders = [] // Variable global para almacenar todos los pedidos

// Sistema de notificaciones
function initNotificationSystem() {
  // Cargar notificaciones guardadas
  notifications = JSON.parse(localStorage.getItem("adminNotifications") || "[]")
  updateNotificationBadge()

  // Verificar nuevos pedidos cada 10 segundos
  setInterval(checkForNewOrders, 10000)

  // Verificar inmediatamente
  checkForNewOrders()
}

async function checkForNewOrders() {
  try {
    const result = await getAllOrders()
    if (result.success) {
      const currentOrderCount = result.orders.length

      if (lastOrderCount > 0 && currentOrderCount > lastOrderCount) {
        // Hay nuevos pedidos
        const newOrdersCount = currentOrderCount - lastOrderCount
        const newNotification = {
          id: Date.now(),
          message: `${newOrdersCount} nuevo${newOrdersCount > 1 ? "s" : ""} pedido${newOrdersCount > 1 ? "s" : ""} recibido${newOrdersCount > 1 ? "s" : ""}`,
          time: new Date().toLocaleTimeString(),
          read: false,
          type: "new_order",
        }

        notifications.unshift(newNotification)

        // Mantener solo las últimas 10 notificaciones
        if (notifications.length > 10) {
          notifications = notifications.slice(0, 10)
        }

        saveNotifications()
        updateNotificationBadge()

        // Mostrar notificación visual
        showNotification(
          `¡${newOrdersCount} nuevo${newOrdersCount > 1 ? "s" : ""} pedido${newOrdersCount > 1 ? "s" : ""}!`,
          "success",
        )
      }

      lastOrderCount = currentOrderCount
    }
  } catch (error) {
    console.error("Error al verificar nuevos pedidos:", error)
  }
}

function saveNotifications() {
  localStorage.setItem("adminNotifications", JSON.stringify(notifications))
}

function updateNotificationBadge() {
  const badge = document.querySelector(".notifications-btn .badge")
  const unreadCount = notifications.filter((n) => !n.read).length

  if (badge) {
    badge.textContent = unreadCount
    badge.style.display = unreadCount > 0 ? "flex" : "none"
  }
}

function showNotificationPanel() {
  const modal = document.createElement("div")
  modal.className = "modal"
  modal.id = "notificationsModal"
  modal.style.display = "flex"
  modal.style.alignItems = "center"
  modal.style.justifyContent = "center"

  modal.innerHTML = `
    <div class="modal-content" style="max-width: 500px; max-height: 600px;">
      <span class="close" onclick="document.getElementById('notificationsModal').remove()">&times;</span>
      <h2 style="margin-bottom: 1rem; display: flex; align-items: center; gap: 0.5rem;">
        <i class="fas fa-bell"></i>
        Notificaciones
      </h2>
      
      <div style="max-height: 400px; overflow-y: auto;">
        ${
          notifications.length === 0
            ? `
          <div style="text-align: center; padding: 2rem; color: #6b7280;">
            <i class="fas fa-bell-slash" style="font-size: 3rem; margin-bottom: 1rem;"></i>
            <p>No hay notificaciones</p>
          </div>
        `
            : notifications
                .map(
                  (notification) => `
          <div class="notification-item ${notification.read ? "read" : "unread"}" style="
            padding: 1rem;
            border: 1px solid ${notification.read ? "#e5e7eb" : "#fbbf24"};
            border-radius: 0.5rem;
            margin-bottom: 0.5rem;
            background: ${notification.read ? "#f9fafb" : "#fffbeb"};
          ">
            <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 0.5rem;">
              <span style="font-weight: 600; color: ${notification.read ? "#6b7280" : "#92400e"};">
                <i class="fas fa-${notification.type === "new_order" ? "shopping-cart" : "info-circle"}"></i>
                ${notification.message}
              </span>
              <span style="font-size: 0.75rem; color: #9ca3af;">${notification.time}</span>
            </div>
            ${
              notification.type === "new_order"
                ? `
              <button class="btn btn-primary btn-sm" onclick="goToOrders(); document.getElementById('notificationsModal').remove();" style="font-size: 0.75rem; padding: 0.25rem 0.5rem;">
                <i class="fas fa-arrow-right"></i>
                Ir a Pedidos
              </button>
            `
                : ""
            }
          </div>
        `,
                )
                .join("")
        }
      </div>
      
      <div style="margin-top: 1rem; display: flex; gap: 0.5rem; justify-content: space-between;">
        <button class="btn btn-outline" onclick="markAllAsRead()">
          <i class="fas fa-check-double"></i>
          Marcar todo como leído
        </button>
        <button class="btn btn-outline" onclick="document.getElementById('notificationsModal').remove()">
          Cerrar
        </button>
      </div>
    </div>
  `

  document.body.appendChild(modal)

  // Marcar notificaciones como leídas
  notifications.forEach((n) => (n.read = true))
  saveNotifications()
  updateNotificationBadge()
}

function markAllAsRead() {
  notifications.forEach((n) => (n.read = true))
  saveNotifications()
  updateNotificationBadge()

  // Actualizar UI del modal
  const modal = document.getElementById("notificationsModal")
  if (modal) {
    modal.remove()
    showNotificationPanel()
  }
}

function goToOrders() {
  // Cambiar a la pestaña de pedidos
  document.querySelector('[data-tab="orders"]').click()
}

// Hacer funciones globales
window.showNotificationPanel = showNotificationPanel
window.markAllAsRead = markAllAsRead
window.goToOrders = goToOrders

function showNotification(message, type = "info") {
  let notificationContainer = document.getElementById("notificationContainer")
  if (!notificationContainer) {
    notificationContainer = document.createElement("div")
    notificationContainer.id = "notificationContainer"
    notificationContainer.style.cssText = `
            position: fixed;
            top: 1rem;
            right: 1rem;
            z-index: 9999;
            pointer-events: none;
        `
    document.body.appendChild(notificationContainer)
  }

  const notification = document.createElement("div")
  notification.className = `notification notification-${type}`
  notification.style.cssText = `
        background: ${type === "success" ? "#10b981" : type === "error" ? "#ef4444" : "#3b82f6"};
        color: white;
        padding: 1rem 1.5rem;
        border-radius: 0.5rem;
        margin-bottom: 0.5rem;
        box-shadow: 0 10px 25px rgba(0, 0, 0, 0.2);
        transform: translateX(100%);
        transition: all 0.3s ease;
        pointer-events: auto;
        font-weight: 600;
        max-width: 300px;
        word-wrap: break-word;
    `

  notification.innerHTML = `
        <div style="display: flex; align-items: center; gap: 0.5rem;">
            <i class="fas fa-${type === "success" ? "check-circle" : type === "error" ? "exclamation-circle" : "info-circle"}"></i>
            <span>${message}</span>
            <button onclick="this.parentElement.parentElement.remove()" style="background: none; border: none; color: white; margin-left: auto; cursor: pointer; font-size: 1.2rem;">×</button>
        </div>
    `

  notificationContainer.appendChild(notification)

  setTimeout(() => {
    notification.style.transform = "translateX(0)"
  }, 100)

  setTimeout(() => {
    if (notification.parentElement) {
      notification.style.transform = "translateX(100%)"
      setTimeout(() => {
        if (notification.parentElement) {
          notification.remove()
        }
      }, 300)
    }
  }, 4000)
}

async function loadProducts() {
  try {
    const result = await getAllProducts()
    if (result.success) {
      products = result.products
      console.log("Productos cargados desde Firebase:", products.length)
    } else {
      console.error("Error al cargar productos:", result.error)
      showNotification("Error al cargar productos", "error")
    }
  } catch (error) {
    console.error("Error al cargar productos:", error)
    showNotification("Error al cargar productos", "error")
  }
}

function setupTabs() {
  const tabButtons = document.querySelectorAll(".tab-btn")
  const tabPanes = document.querySelectorAll(".tab-pane")

  tabButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const tabId = button.getAttribute("data-tab")

      tabButtons.forEach((btn) => btn.classList.remove("active"))
      tabPanes.forEach((pane) => pane.classList.remove("active"))

      button.classList.add("active")
      document.getElementById(tabId).classList.add("active")

      loadTabContent(tabId)
    })
  })
}

async function loadTabContent(tabId) {
  switch (tabId) {
    case "orders":
      await renderOrders()
      break
    case "menu":
      await renderMenuPreview()
      break
    case "edit":
      await renderEditProducts()
      break
    case "add":
      setupProductForm()
      break
  }
}

async function renderOrders() {
  console.log("Renderizando pedidos en admin...")
  const ordersContainer = document.getElementById("ordersContainer")

  // Mostrar loading
  ordersContainer.innerHTML = `
    <div style="text-align: center; padding: 2rem;">
      <i class="fas fa-spinner fa-spin" style="font-size: 2rem; color: #6b7280; margin-bottom: 1rem;"></i>
      <p>Cargando pedidos...</p>
    </div>
  `

  try {
    // Obtener todos los pedidos desde Firebase
    const result = await getAllOrders()
    console.log("Resultado de Firebase:", result)

    let ordersList = []
    if (result.success) {
      ordersList = result.orders
    }

    // También obtener pedidos de localStorage para compatibilidad
    const localOrders = JSON.parse(localStorage.getItem("orders") || "{}")
    console.log("Pedidos locales:", localOrders)

    let localOrdersList = []
    if (Array.isArray(localOrders)) {
      localOrdersList = localOrders
    } else {
      for (const email in localOrders) {
        if (Array.isArray(localOrders[email])) {
          localOrdersList = localOrdersList.concat(localOrders[email])
        }
      }
    }

    // Combinar pedidos evitando duplicados
    allOrders = [...ordersList]
    localOrdersList.forEach((localOrder) => {
      if (!allOrders.some((order) => order.id === localOrder.id)) {
        allOrders.push(localOrder)
      }
    })

    console.log("Total de pedidos:", allOrders.length)

    if (allOrders.length === 0) {
      ordersContainer.innerHTML = `
        <div class="empty-cart">
          <i class="fas fa-box"></i>
          <p>No hay pedidos aún</p>
        </div>
      `
      return
    }

    // Ordenar pedidos por fecha (más recientes primero)
    const sortedOrders = [...allOrders].sort((a, b) => {
      const dateA = a.createdAt
        ? a.createdAt.seconds
          ? new Date(a.createdAt.seconds * 1000)
          : new Date(a.createdAt)
        : new Date(a.date || 0)
      const dateB = b.createdAt
        ? b.createdAt.seconds
          ? new Date(b.createdAt.seconds * 1000)
          : new Date(b.createdAt)
        : new Date(b.date || 0)
      return dateB - dateA
    })

    ordersContainer.innerHTML = sortedOrders
      .map((order) => {
        // Formatear fecha
        let orderDate = "Fecha no disponible"
        if (order.createdAt) {
          if (order.createdAt.seconds) {
            orderDate = new Date(order.createdAt.seconds * 1000).toLocaleString()
          } else {
            orderDate = new Date(order.createdAt).toLocaleString()
          }
        } else if (order.date) {
          orderDate = order.date
        }

        const orderId = order.firebaseId || order.id || "unknown"

        return `
          <div class="admin-order-card" id="order-${orderId}">
              <div class="admin-order-header">
                  <div>
                      <h3>Pedido #${order.id || orderId}</h3>
                      <p>${order.customerName || "Cliente"} - ${order.phone || "Sin teléfono"}</p>
                      <p>${orderDate} - ${order.details?.orderType || "N/A"}</p>
                  </div>
                  <div class="text-right">
                      <div class="status-badge status-${order.status || "pendiente"}">${order.status || "pendiente"}</div>
                      <p class="order-total">$${(order.total || 0).toLocaleString()}</p>
                  </div>
              </div>
              <div class="admin-order-content">
                  <div class="admin-order-items">
                      <h4>Productos:</h4>
                      ${(order.items || [])
                        .map(
                          (item) => `
                          <p>${item.name || "Producto"} x${item.quantity || 1} ${item.observation ? `<span style="color: #6b7280;">(${item.observation})</span>` : ""}</p>
                      `,
                        )
                        .join("")}
                  </div>
                  <div style="display: flex; flex-wrap: wrap; gap: 0.5rem; margin-top: 1rem;">
                      <select class="status-select" onchange="updateOrderStatus('${orderId}', this.value)">
                          <option value="pendiente" ${order.status === "pendiente" ? "selected" : ""}>Pendiente</option>
                          <option value="preparando" ${order.status === "preparando" ? "selected" : ""}>Preparando</option>
                          <option value="listo" ${order.status === "listo" ? "selected" : ""}>Listo</option>
                          <option value="entregado" ${order.status === "entregado" ? "selected" : ""}>Entregado</option>
                      </select>
                      
                      <button class="btn btn-outline" onclick="printKitchenOrder('${orderId}')">
                          <i class="fas fa-print"></i> Comanda
                      </button>
                      
                      <button class="btn btn-outline" onclick="printReceipt('${orderId}')">
                          <i class="fas fa-file-invoice"></i> Recibo
                      </button>
                      
                      <button class="btn btn-outline" onclick="viewOrderDetails('${orderId}')">
                          <i class="fas fa-eye"></i> Ver Detalles
                      </button>
                  </div>
              </div>
          </div>
      `
      })
      .join("")
  } catch (error) {
    console.error("Error al cargar pedidos:", error)
    ordersContainer.innerHTML = `
      <div class="empty-cart">
        <i class="fas fa-exclamation-triangle"></i>
        <p>Error al cargar los pedidos</p>
        <button class="btn btn-primary" onclick="renderOrders()">Reintentar</button>
      </div>
    `
    showNotification("Error al cargar pedidos", "error")
  }
}

async function updateOrderStatusAdmin(orderId, newStatus) {
  console.log(`Actualizando estado del pedido ${orderId} a ${newStatus}`)

  try {
    // Intentar actualizar en Firebase primero
    const result = await updateOrderStatus(orderId, newStatus)

    if (result.success) {
      showNotification(`Estado del pedido #${orderId} actualizado a ${newStatus}`, "success")

      // Actualizar la UI
      const statusBadge = document.querySelector(`#order-${orderId} .status-badge`)
      if (statusBadge) {
        statusBadge.className = `status-badge status-${newStatus}`
        statusBadge.textContent = newStatus
      }
    } else {
      // Si falla Firebase, intentar con localStorage
      const allOrders = JSON.parse(localStorage.getItem("orders") || "{}")
      let updated = false

      if (Array.isArray(allOrders)) {
        const orderIndex = allOrders.findIndex((o) => o.id === orderId)
        if (orderIndex !== -1) {
          allOrders[orderIndex].status = newStatus
          updated = true
        }
      } else {
        for (const email in allOrders) {
          const orderIndex = allOrders[email].findIndex((o) => o.id === orderId)
          if (orderIndex !== -1) {
            allOrders[email][orderIndex].status = newStatus
            updated = true
            break
          }
        }
      }

      if (updated) {
        localStorage.setItem("orders", JSON.stringify(allOrders))
        showNotification(`Estado del pedido #${orderId} actualizado a ${newStatus}`, "success")

        const statusBadge = document.querySelector(`#order-${orderId} .status-badge`)
        if (statusBadge) {
          statusBadge.className = `status-badge status-${newStatus}`
          statusBadge.textContent = newStatus
        }
      } else {
        showNotification(`No se encontró el pedido #${orderId}`, "error")
      }
    }
  } catch (error) {
    console.error("Error al actualizar estado:", error)
    showNotification("Error al actualizar el estado del pedido", "error")
  }
}

async function renderMenuPreview() {
  await loadProducts()
  const menuPreview = document.getElementById("menuPreview")

  if (products.length === 0) {
    menuPreview.innerHTML = `
      <div style="text-align: center; padding: 2rem; grid-column: 1 / -1;">
        <i class="fas fa-plus-circle" style="font-size: 3rem; color: #9ca3af; margin-bottom: 1rem;"></i>
        <h3 style="color: #374151; margin-bottom: 0.5rem;">No hay productos en el menú</h3>
        <p style="color: #6b7280; margin-bottom: 1rem;">Agrega productos para que aparezcan en el menú</p>
        <button class="btn btn-primary" onclick="document.querySelector('[data-tab=\\"add\\"]').click()">
          <i class="fas fa-plus"></i> Agregar Producto
        </button>
      </div>
    `
    return
  }

  menuPreview.innerHTML = products
    .map(
      (product) => `
        <div class="product-card">
            <img src="${product.image}" alt="${product.name}" class="product-image" onerror="this.src='https://images.unsplash.com/photo-1565299624946-b28f40a0ca4b?w=300&h=200&fit=crop'">
            <div class="product-info">
                <div class="badge mb-2">${product.category}</div>
                <h3 class="product-name">${product.name}</h3>
                <p class="product-description">${product.description}</p>
                <p class="product-price">$${product.price.toLocaleString()}</p>
            </div>
        </div>
    `,
    )
    .join("")
}

async function renderEditProducts() {
  await loadProducts()
  const editProductsList = document.getElementById("editProductsList")

  if (products.length === 0) {
    editProductsList.innerHTML = `
      <div style="text-align: center; padding: 2rem;">
        <i class="fas fa-edit" style="font-size: 3rem; color: #9ca3af; margin-bottom: 1rem;"></i>
        <h3 style="color: #374151; margin-bottom: 0.5rem;">No hay productos para editar</h3>
        <p style="color: #6b7280; margin-bottom: 1rem;">Agrega productos primero para poder editarlos</p>
        <button class="btn btn-primary" onclick="document.querySelector('[data-tab=\\"add\\"]').click()">
          <i class="fas fa-plus"></i> Agregar Producto
        </button>
      </div>
    `
    return
  }

  editProductsList.innerHTML = products
    .map(
      (product) => `
        <div class="edit-product-item">
            <div class="edit-product-info">
                <img src="${product.image}" alt="${product.name}" class="edit-product-image" onerror="this.src='https://images.unsplash.com/photo-1565299624946-b28f40a0ca4b?w=300&h=200&fit=crop'">
                <div class="edit-product-details">
                    <h3>${product.name}</h3>
                    <p>${product.category}</p>
                    <p class="edit-product-price">$${product.price.toLocaleString()}</p>
                </div>
            </div>
            <div class="edit-product-actions">
                <button class="edit-btn" onclick="editProduct('${product.id}')">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="delete-btn" onclick="deleteProductAdmin('${product.id}')">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        </div>
    `,
    )
    .join("")
}

function setupProductForm() {
  const productForm = document.getElementById("productForm")
  const imageUpload = document.getElementById("imageUpload")
  const imageUrl = document.getElementById("productImage")
  const imagePreview = document.getElementById("imagePreview")
  const uploadOption = document.getElementById("uploadOption")
  const urlOption = document.getElementById("urlOption")

  // Configurar opciones de imagen
  document.getElementById("imageOptionUpload").addEventListener("change", function () {
    if (this.checked) {
      uploadOption.style.display = "block"
      urlOption.style.display = "none"
      imageUrl.value = ""
    }
  })

  document.getElementById("imageOptionUrl").addEventListener("change", function () {
    if (this.checked) {
      uploadOption.style.display = "none"
      urlOption.style.display = "block"
      imageUpload.value = ""
      imagePreview.innerHTML = ""
    }
  })

  // Preview de imagen subida
  imageUpload.addEventListener("change", (e) => {
    const file = e.target.files[0]
    if (file) {
      if (file.type.startsWith("image/")) {
        const reader = new FileReader()
        reader.onload = (e) => {
          imagePreview.innerHTML = `
            <img src="${e.target.result}" alt="Preview" style="width: 100%; max-width: 200px; height: 120px; object-fit: cover; border-radius: 0.5rem; margin-top: 0.5rem;">
          `
        }
        reader.readAsDataURL(file)
      } else {
        showNotification("Por favor selecciona un archivo de imagen válido", "error")
        imageUpload.value = ""
        imagePreview.innerHTML = ""
      }
    }
  })

  // Preview de imagen por URL
  imageUrl.addEventListener("input", function () {
    const url = this.value
    if (url) {
      imagePreview.innerHTML = `
        <img src="${url}" alt="Preview" style="width: 100%; max-width: 200px; height: 120px; object-fit: cover; border-radius: 0.5rem; margin-top: 0.5rem;" 
             onerror="this.style.display='none'; this.nextElementSibling.style.display='block';">
        <p style="display: none; color: #ef4444; font-size: 0.875rem; margin-top: 0.5rem;">Error al cargar la imagen</p>
      `
    } else {
      imagePreview.innerHTML = ""
    }
  })

  productForm.addEventListener("submit", async (e) => {
    e.preventDefault()

    const formData = {
      name: document.getElementById("productName").value,
      price: Number.parseInt(document.getElementById("productPrice").value),
      description: document.getElementById("productDescription").value,
      category: document.getElementById("category").value,
    }

    if (!formData.name || !formData.price || !formData.category) {
      showNotification("Por favor completa todos los campos obligatorios", "error")
      return
    }

    // Manejar imagen
    let imageUrl = ""
    if (document.getElementById("imageOptionUpload").checked) {
      const file = imageUpload.files[0]
      if (file) {
        // Convertir imagen a base64
        const reader = new FileReader()
        reader.onload = async (e) => {
          formData.image = e.target.result
          if (editingProduct) {
            await updateProductAdmin(formData)
          } else {
            await addProductAdmin(formData)
          }
        }
        reader.readAsDataURL(file)
        return
      } else if (!editingProduct) {
        showNotification("Por favor selecciona una imagen", "error")
        return
      }
    } else {
      imageUrl = document.getElementById("productImage").value
      if (!imageUrl && !editingProduct) {
        showNotification("Por favor ingresa una URL de imagen", "error")
        return
      }
      formData.image = imageUrl || "https://images.unsplash.com/photo-1565299624946-b28f40a0ca4b?w=300&h=200&fit=crop"
    }

    if (editingProduct) {
      await updateProductAdmin(formData)
    } else {
      await addProductAdmin(formData)
    }
  })
}

async function addProductAdmin(formData) {
  try {
    const result = await saveProduct(formData)
    if (result.success) {
      await loadProducts()
      resetProductForm()
      showNotification("Producto agregado exitosamente", "success")
    } else {
      showNotification("Error al agregar producto: " + result.error, "error")
    }
  } catch (error) {
    console.error("Error al agregar producto:", error)
    showNotification("Error al agregar producto", "error")
  }
}

async function editProduct(productId) {
  const product = products.find((p) => p.id === productId)
  if (!product) return

  editingProduct = product

  document.getElementById("productName").value = product.name
  document.getElementById("productPrice").value = product.price
  document.getElementById("productDescription").value = product.description
  document.getElementById("category").value = product.category

  // Configurar imagen
  if (product.image && product.image.startsWith("data:")) {
    // Es una imagen base64
    document.getElementById("imageOptionUpload").checked = true
    document.getElementById("uploadOption").style.display = "block"
    document.getElementById("urlOption").style.display = "none"
    document.getElementById("imagePreview").innerHTML = `
      <img src="${product.image}" alt="Preview" style="width: 100%; max-width: 200px; height: 120px; object-fit: cover; border-radius: 0.5rem; margin-top: 0.5rem;">
    `
  } else {
    // Es una URL
    document.getElementById("imageOptionUrl").checked = true
    document.getElementById("uploadOption").style.display = "none"
    document.getElementById("urlOption").style.display = "block"
    document.getElementById("productImage").value = product.image
    document.getElementById("imagePreview").innerHTML = `
      <img src="${product.image}" alt="Preview" style="width: 100%; max-width: 200px; height: 120px; object-fit: cover; border-radius: 0.5rem; margin-top: 0.5rem;">
    `
  }

  document.getElementById("formTitle").textContent = "Editar Producto"
  document.getElementById("submitText").textContent = "Actualizar Producto"
  document.getElementById("cancelEdit").style.display = "inline-flex"

  document.querySelector('[data-tab="add"]').click()
}

async function updateProductAdmin(formData) {
  try {
    const result = await updateProduct(editingProduct.id, formData)
    if (result.success) {
      await loadProducts()
      resetProductForm()
      showNotification("Producto actualizado exitosamente", "success")
      await renderEditProducts()
    } else {
      showNotification("Error al actualizar producto: " + result.error, "error")
    }
  } catch (error) {
    console.error("Error al actualizar producto:", error)
    showNotification("Error al actualizar producto", "error")
  }
}

async function deleteProductAdmin(productId) {
  if (confirm("¿Estás seguro de que deseas eliminar este producto?")) {
    try {
      const result = await deleteProduct(productId)
      if (result.success) {
        await loadProducts()
        await renderEditProducts()
        showNotification("Producto eliminado exitosamente", "success")
      } else {
        showNotification("Error al eliminar producto: " + result.error, "error")
      }
    } catch (error) {
      console.error("Error al eliminar producto:", error)
      showNotification("Error al eliminar producto", "error")
    }
  }
}

function resetProductForm() {
  editingProduct = null
  document.getElementById("productForm").reset()
  document.getElementById("imagePreview").innerHTML = ""
  document.getElementById("formTitle").textContent = "Agregar Nuevo Producto"
  document.getElementById("submitText").textContent = "Guardar Producto"
  document.getElementById("cancelEdit").style.display = "none"
  document.getElementById("imageOptionUrl").checked = true
  document.getElementById("uploadOption").style.display = "none"
  document.getElementById("urlOption").style.display = "block"
}

// Función para encontrar un pedido por ID
function findOrderById(orderId) {
  return allOrders.find((order) => order.firebaseId === orderId || order.id === orderId)
}

// Función para imprimir comanda a cocina
function printKitchenOrderFunction(orderId) {
  try {
    const order = findOrderById(orderId)
    if (!order) {
      showNotification("No se encontró el pedido", "error")
      return
    }

    // Formatear fecha
    let orderDate = "Fecha no disponible"
    let orderTime = "Hora no disponible"

    if (order.createdAt) {
      if (order.createdAt.seconds) {
        const date = new Date(order.createdAt.seconds * 1000)
        orderDate = date.toLocaleDateString()
        orderTime = date.toLocaleTimeString()
      } else {
        const date = new Date(order.createdAt)
        orderDate = date.toLocaleDateString()
        orderTime = date.toLocaleTimeString()
      }
    } else if (order.date) {
      const parts = order.date.split(" ")
      if (parts.length >= 2) {
        orderDate = parts[0]
        orderTime = parts[1]
      } else {
        orderDate = order.date
      }
    }

    // Crear ventana de impresión
    const printWindow = window.open("", "_blank", "width=600,height=600")

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Comanda #${order.id}</title>
        <style>
          body {
            font-family: 'Courier New', monospace;
            padding: 20px;
            max-width: 300px;
            margin: 0 auto;
            line-height: 1.4;
          }
          h1 {
            font-size: 18px;
            text-align: center;
            margin-bottom: 10px;
            border-bottom: 2px solid #000;
            padding-bottom: 5px;
          }
          .info {
            font-size: 14px;
            margin-bottom: 5px;
          }
          .section {
            margin: 15px 0;
            border-bottom: 1px dashed #000;
            padding-bottom: 10px;
          }
          .product {
            margin: 8px 0;
            font-size: 14px;
            font-weight: bold;
          }
          .observation {
            font-size: 12px;
            color: #666;
            font-style: italic;
            margin-left: 10px;
          }
          .footer {
            margin-top: 20px;
            text-align: center;
            font-size: 12px;
            border-top: 2px solid #000;
            padding-top: 10px;
          }
          @media print {
            .no-print {
              display: none;
            }
          }
        </style>
      </head>
      <body>
        <h1>🍽️ COMANDA COCINA 🍽️</h1>
        
        <div class="section">
          <div class="info"><strong>PEDIDO:</strong> #${order.id}</div>
          <div class="info"><strong>CLIENTE:</strong> ${order.customerName || "Cliente"}</div>
          <div class="info"><strong>FECHA:</strong> ${orderDate}</div>
          <div class="info"><strong>HORA:</strong> ${orderTime}</div>
          <div class="info"><strong>TIPO:</strong> ${order.details?.orderType || "N/A"}</div>
        </div>
        
        <div class="section">
          <h2 style="font-size: 16px; margin-bottom: 10px;">📋 PRODUCTOS A PREPARAR:</h2>
          ${(order.items || [])
            .map(
              (item) => `
            <div class="product">
              • ${item.name || "Producto"} x${item.quantity || 1}
              ${item.observation ? `<div class="observation">⚠️ Obs: ${item.observation}</div>` : ""}
            </div>
          `,
            )
            .join("")}
        </div>
        
        <div class="footer">
          <strong>** COMANDA PARA COCINA **</strong><br>
          Restaurante Sabores<br>
          ${new Date().toLocaleString()}
        </div>
        
        <div class="no-print" style="margin-top: 30px; text-align: center;">
          <button onclick="window.print()" style="padding: 10px 20px; background: #ef4444; color: white; border: none; border-radius: 5px; cursor: pointer; font-size: 14px;">
            🖨️ Imprimir Comanda
          </button>
        </div>
      </body>
      </html>
    `)

    printWindow.document.close()
    showNotification("Comanda lista para imprimir", "success")
  } catch (error) {
    console.error("Error al imprimir comanda:", error)
    showNotification("Error al generar la comanda", "error")
  }
}

// Función para imprimir recibo
function printReceiptFunction(orderId) {
  try {
    const order = findOrderById(orderId)
    if (!order) {
      showNotification("No se encontró el pedido", "error")
      return
    }

    // Formatear fecha
    let orderDate = "Fecha no disponible"
    let orderTime = "Hora no disponible"

    if (order.createdAt) {
      if (order.createdAt.seconds) {
        const date = new Date(order.createdAt.seconds * 1000)
        orderDate = date.toLocaleDateString()
        orderTime = date.toLocaleTimeString()
      } else {
        const date = new Date(order.createdAt)
        orderDate = date.toLocaleDateString()
        orderTime = date.toLocaleTimeString()
      }
    } else if (order.date) {
      const parts = order.date.split(" ")
      if (parts.length >= 2) {
        orderDate = parts[0]
        orderTime = parts[1]
      } else {
        orderDate = order.date
      }
    }

    // Calcular subtotal y propina
    const subtotal = (order.items || []).reduce((sum, item) => sum + (item.price || 0) * (item.quantity || 1), 0)
    const tip = order.details?.tip || 0
    const total = order.total || subtotal + tip

    // Crear ventana de impresión
    const printWindow = window.open("", "_blank", "width=600,height=600")

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Recibo #${order.id}</title>
        <style>
          body {
            font-family: 'Courier New', monospace;
            padding: 20px;
            max-width: 300px;
            margin: 0 auto;
            line-height: 1.4;
          }
          h1 {
            font-size: 18px;
            text-align: center;
            margin-bottom: 10px;
            border-bottom: 2px solid #000;
            padding-bottom: 5px;
          }
          .info {
            font-size: 14px;
            margin-bottom: 5px;
          }
          .section {
            margin: 15px 0;
            border-bottom: 1px dashed #000;
            padding-bottom: 10px;
          }
          .product {
            margin: 5px 0;
            font-size: 14px;
            display: flex;
            justify-content: space-between;
          }
          .totals {
            margin-top: 10px;
            font-size: 14px;
          }
          .total-line {
            display: flex;
            justify-content: space-between;
            margin: 3px 0;
          }
          .final-total {
            font-weight: bold;
            border-top: 1px solid #000;
            padding-top: 5px;
            margin-top: 5px;
          }
          .footer {
            margin-top: 20px;
            text-align: center;
            font-size: 12px;
            border-top: 2px solid #000;
            padding-top: 10px;
          }
          @media print {
            .no-print {
              display: none;
            }
          }
        </style>
      </head>
      <body>
        <h1>🧾 RESTAURANTE SABORES 🧾</h1>
        
        <div class="section">
          <div class="info"><strong>RECIBO:</strong> #${order.id}</div>
          <div class="info"><strong>CLIENTE:</strong> ${order.customerName || "Cliente"}</div>
          <div class="info"><strong>TELÉFONO:</strong> ${order.phone || "N/A"}</div>
          <div class="info"><strong>FECHA:</strong> ${orderDate}</div>
          <div class="info"><strong>HORA:</strong> ${orderTime}</div>
          <div class="info"><strong>TIPO:</strong> ${order.details?.orderType || "N/A"}</div>
          ${order.details?.paymentMethod ? `<div class="info"><strong>PAGO:</strong> ${order.details.paymentMethod}</div>` : ""}
        </div>
        
        <div class="section">
          <h2 style="font-size: 16px; margin-bottom: 10px;">📋 DETALLE DE COMPRA:</h2>
          ${(order.items || [])
            .map(
              (item) => `
            <div class="product">
              <span>${item.name || "Producto"} x${item.quantity || 1}</span>
              <span>$${((item.price || 0) * (item.quantity || 1)).toLocaleString()}</span>
            </div>
          `,
            )
            .join("")}
        </div>
        
        <div class="totals">
          <div class="total-line">
            <span>Subtotal:</span>
            <span>$${subtotal.toLocaleString()}</span>
          </div>
          ${
            tip > 0
              ? `
          <div class="total-line">
            <span>Propina:</span>
            <span>$${tip.toLocaleString()}</span>
          </div>
          `
              : ""
          }
          <div class="total-line final-total">
            <span><strong>TOTAL:</strong></span>
            <span><strong>$${total.toLocaleString()}</strong></span>
          </div>
        </div>
        
        <div class="footer">
          <strong>¡Gracias por su compra! 😊</strong><br>
          NIT: 900.123.456-7<br>
          Tel: +123 456 789<br>
          www.restaurantesabores.com<br><br>
          <em>¡Esperamos verte pronto!</em>
        </div>
        
        <div class="no-print" style="margin-top: 30px; text-align: center;">
          <button onclick="window.print()" style="padding: 10px 20px; background: #10b981; color: white; border: none; border-radius: 5px; cursor: pointer; font-size: 14px;">
            🖨️ Imprimir Recibo
          </button>
        </div>
      </body>
      </html>
    `)

    printWindow.document.close()
    showNotification("Recibo listo para imprimir", "success")
  } catch (error) {
    console.error("Error al imprimir recibo:", error)
    showNotification("Error al generar el recibo", "error")
  }
}

// Función para ver detalles del pedido
function viewOrderDetailsFunction(orderId) {
  try {
    const order = findOrderById(orderId)
    if (!order) {
      showNotification("No se encontró el pedido", "error")
      return
    }

    // Formatear fecha
    let orderDate = "Fecha no disponible"
    if (order.createdAt) {
      if (order.createdAt.seconds) {
        orderDate = new Date(order.createdAt.seconds * 1000).toLocaleString()
      } else {
        orderDate = new Date(order.createdAt).toLocaleString()
      }
    } else if (order.date) {
      orderDate = order.date
    }

    // Calcular subtotal y propina
    const subtotal = (order.items || []).reduce((sum, item) => sum + (item.price || 0) * (item.quantity || 1), 0)
    const tip = order.details?.tip || 0
    const total = order.total || subtotal + tip

    // Crear modal de detalles
    const modal = document.createElement("div")
    modal.style.position = "fixed"
    modal.style.top = "0"
    modal.style.left = "0"
    modal.style.width = "100%"
    modal.style.height = "100%"
    modal.style.backgroundColor = "rgba(0, 0, 0, 0.5)"
    modal.style.display = "flex"
    modal.style.alignItems = "center"
    modal.style.justifyContent = "center"
    modal.style.zIndex = "2000"

    modal.innerHTML = `
      <div style="background: white; padding: 2rem; border-radius: 0.5rem; max-width: 600px; width: 90%; max-height: 90vh; overflow-y: auto;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem;">
          <h2 style="margin: 0; color: #1f2937; display: flex; align-items: center; gap: 0.5rem;">
            <i class="fas fa-eye"></i>
            Detalles del Pedido #${order.id}
          </h2>
          <button id="closeDetailModal" style="background: none; border: none; font-size: 1.5rem; cursor: pointer; color: #6b7280;">&times;</button>
        </div>
        
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 1.5rem; padding: 1rem; background: #f9fafb; border-radius: 0.5rem;">
          <div>
            <p style="margin-bottom: 0.5rem;"><strong>👤 Cliente:</strong> ${order.customerName || "No disponible"}</p>
            <p style="margin-bottom: 0.5rem;"><strong>📱 Teléfono:</strong> ${order.phone || "No disponible"}</p>
            <p style="margin-bottom: 0.5rem;"><strong>📅 Fecha:</strong> ${orderDate}</p>
          </div>
          <div>
            <p style="margin-bottom: 0.5rem;"><strong>📍 Tipo:</strong> ${order.details?.orderType || "No especificado"}</p>
            <p style="margin-bottom: 0.5rem;"><strong>💳 Pago:</strong> ${order.details?.paymentMethod || "No especificado"}</p>
            <p style="margin-bottom: 0.5rem;"><strong>📊 Estado:</strong> 
              <span style="display: inline-block; padding: 0.25rem 0.5rem; background: ${getStatusColor(order.status)}; color: white; border-radius: 0.25rem; font-size: 0.875rem;">
                ${order.status || "pendiente"}
              </span>
            </p>
          </div>
        </div>
        
        ${
          order.details && order.details.address
            ? `
        <div style="margin-bottom: 1.5rem; padding: 1rem; background: #fef3c7; border-radius: 0.5rem; border: 1px solid #fbbf24;">
          <p style="margin: 0; color: #92400e;"><strong>🏠 Dirección de entrega:</strong> ${order.details.address}</p>
        </div>
        `
            : ""
        }
        
        <div style="margin-bottom: 1.5rem;">
          <h3 style="margin-bottom: 1rem; color: #1f2937; display: flex; align-items: center; gap: 0.5rem;">
            <i class="fas fa-utensils"></i>
            Productos Pedidos:
          </h3>
          <div style="background: #f9fafb; border-radius: 0.5rem; padding: 1rem; border: 1px solid #e5e7eb;">
            ${(order.items || [])
              .map(
                (item) => `
              <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 1rem; padding-bottom: 1rem; border-bottom: 1px solid #e5e7eb;">
                <div style="flex: 1;">
                  <div style="font-weight: 600; color: #1f2937;">${item.name || "Producto"}</div>
                  <div style="color: #6b7280; font-size: 0.875rem;">Cantidad: ${item.quantity || 1}</div>
                  ${item.observation ? `<div style="color: #059669; font-size: 0.875rem; font-style: italic; margin-top: 0.25rem;">📝 ${item.observation}</div>` : ""}
                </div>
                <div style="text-align: right;">
                  <div style="font-weight: 600; color: #059669;">$${((item.price || 0) * (item.quantity || 1)).toLocaleString()}</div>
                  <div style="color: #6b7280; font-size: 0.875rem;">$${(item.price || 0).toLocaleString()} c/u</div>
                </div>
              </div>
            `,
              )
              .join("")}
            
            <div style="margin-top: 1rem; padding-top: 1rem; border-top: 2px solid #e5e7eb;">
              <div style="display: flex; justify-content: space-between; margin-bottom: 0.5rem;">
                <span style="color: #6b7280;">Subtotal:</span>
                <span style="font-weight: 600;">$${subtotal.toLocaleString()}</span>
              </div>
              ${
                tip > 0
                  ? `
              <div style="display: flex; justify-content: space-between; margin-bottom: 0.5rem;">
                <span style="color: #6b7280;">Propina:</span>
                <span style="font-weight: 600;">$${tip.toLocaleString()}</span>
              </div>
              `
                  : ""
              }
              <div style="display: flex; justify-content: space-between; font-size: 1.25rem; font-weight: bold; color: #059669; border-top: 1px solid #d1d5db; padding-top: 0.5rem;">
                <span>Total:</span>
                <span>$${total.toLocaleString()}</span>
              </div>
            </div>
          </div>
        </div>
        
        <div style="display: flex; gap: 0.5rem; justify-content: flex-end; flex-wrap: wrap;">
          <button onclick="printKitchenOrder('${orderId}')" class="btn btn-outline" style="display: inline-flex; align-items: center; gap: 0.25rem;">
            <i class="fas fa-print"></i> Comanda
          </button>
          <button onclick="printReceipt('${orderId}')" class="btn btn-success" style="display: inline-flex; align-items: center; gap: 0.25rem;">
            <i class="fas fa-file-invoice"></i> Recibo
          </button>
          <button onclick="updateOrderStatus('${orderId}', 'listo')" class="btn btn-primary" style="display: inline-flex; align-items: center; gap: 0.25rem;">
            <i class="fas fa-check"></i> Marcar Listo
          </button>
        </div>
      </div>
    `

    document.body.appendChild(modal)

    // Cerrar modal al hacer clic en el botón de cerrar
    document.getElementById("closeDetailModal").addEventListener("click", () => {
      document.body.removeChild(modal)
    })

    // Cerrar modal al hacer clic fuera del contenido
    modal.addEventListener("click", (e) => {
      if (e.target === modal) {
        document.body.removeChild(modal)
      }
    })
  } catch (error) {
    console.error("Error al ver detalles del pedido:", error)
    showNotification("Error al cargar los detalles del pedido", "error")
  }
}

// Función auxiliar para obtener el color según el estado
function getStatusColor(status) {
  switch (status) {
    case "pendiente":
      return "#eab308"
    case "preparando":
      return "#3b82f6"
    case "listo":
      return "#10b981"
    case "entregado":
      return "#6b7280"
    default:
      return "#eab308"
  }
}

// Funciones globales para onclick
window.updateOrderStatus = updateOrderStatusAdmin
window.editProduct = editProduct
window.deleteProductAdmin = deleteProductAdmin
window.renderOrders = renderOrders
window.printKitchenOrder = printKitchenOrderFunction
window.printReceipt = printReceiptFunction
window.viewOrderDetails = viewOrderDetailsFunction

document.addEventListener("DOMContentLoaded", async () => {
  console.log("DOM cargado en admin.js")

  // Inicializar sistema de notificaciones
  initNotificationSystem()

  // Configurar botón de notificaciones
  const notificationsBtn = document.querySelector(".notifications-btn")
  if (notificationsBtn) {
    notificationsBtn.addEventListener("click", showNotificationPanel)
  }

  setupTabs()
  await loadProducts()
  await loadTabContent("orders")

  document.getElementById("cancelEdit").addEventListener("click", resetProductForm)

  document.getElementById("logoutBtn").addEventListener("click", () => {
    localStorage.removeItem("currentUser")
    localStorage.removeItem("currentUserEmail")
    localStorage.removeItem("cart")
    localStorage.removeItem("adminNotifications")
    showNotification("Sesión cerrada correctamente", "success")
    window.location.href = "menu.html"
  })

  showNotification("¡Bienvenido al panel de administración!", "success")
})


