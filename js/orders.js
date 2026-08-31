import { getOrdersByUser } from "./firebase.js"

function showNotification(message, type = "info") {
  const notification = document.getElementById("notification")
  notification.textContent = message
  notification.className = `notification ${type}`
  notification.classList.add("show")
  setTimeout(() => notification.classList.remove("show"), 3000)
}

async function renderOrders() {
  console.log("=== INICIANDO RENDERIZADO DE PEDIDOS ===")

  const ordersContainer = document.getElementById("ordersContainer")
  const user = JSON.parse(localStorage.getItem("currentUser") || "null")

  console.log("Usuario actual:", user)

  if (!user || !user.email) {
    console.log("Usuario no autenticado")
    ordersContainer.innerHTML = `
      <div class="empty-cart">
        <i class="fas fa-user-lock"></i>
        <p>Debes iniciar sesión para ver tus pedidos</p>
        <a href="inicioSesion.html" class="btn btn-primary">Iniciar Sesión</a>
      </div>
    `
    return
  }

  try {
    console.log("Obteniendo pedidos de Firebase para:", user.email)

    // Obtener pedidos del usuario desde Firebase
    const result = await getOrdersByUser(user.email)
    console.log("Resultado de Firebase:", result)

    let firebaseOrders = []
    if (result.success && result.orders) {
      firebaseOrders = result.orders
      console.log("Pedidos de Firebase:", firebaseOrders.length)
    } else {
      console.log("No se pudieron obtener pedidos de Firebase:", result.error)
    }

    // También verificar pedidos en localStorage (para compatibilidad)
    const localOrders = JSON.parse(localStorage.getItem("orders") || "{}")
    console.log("Pedidos en localStorage:", localOrders)

    let localUserOrders = []
    if (Array.isArray(localOrders)) {
      localUserOrders = localOrders.filter(
        (order) => order.customerEmail === user.email || order.userEmail === user.email,
      )
    } else if (typeof localOrders === "object") {
      localUserOrders = localOrders[user.email] || []
    }
    console.log("Pedidos locales del usuario:", localUserOrders.length)

    // Combinar pedidos (evitando duplicados por ID)
    const allUserOrders = [...firebaseOrders]
    localUserOrders.forEach((localOrder) => {
      if (!allUserOrders.some((order) => order.id === localOrder.id)) {
        allUserOrders.push(localOrder)
      }
    })

    console.log("Total de pedidos combinados:", allUserOrders.length)

    // Obtener carrito actual
    const cart = JSON.parse(localStorage.getItem("cart") || "[]")
    console.log("Carrito actual:", cart.length, "items")

    let content = ""

    // Mostrar carrito actual si no está vacío
    if (cart.length > 0) {
      const cartTotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0)
      content += `
        <div class="order-card">
          <div class="order-header">
            <div class="order-info">
              <h3>🛒 Carrito Actual</h3>
              <p><i class="fas fa-calendar-alt"></i> ${new Date().toLocaleString()}</p>
              <p><i class="fas fa-shopping-cart"></i> En el carrito</p>
            </div>
            <div class="order-status">
              <div class="status-badge status-pendiente">
                <i class="fas fa-clock"></i>
                <span>Pendiente</span>
              </div>
              <p class="order-total">$${cartTotal.toLocaleString()}</p>
            </div>
          </div>
          <div class="order-items">
            <h4>Productos en el carrito:</h4>
            ${cart
              .map(
                (item) => `
              <div class="order-item">
                <span class="order-item-name">${item.name} x${item.quantity}</span>
                <span class="order-item-price">$${(item.price * item.quantity).toLocaleString()}</span>
              </div>
            `,
              )
              .join("")}
          </div>
          <div class="order-actions">
            <a href="cart.html" class="btn btn-primary w-full">
              <i class="fas fa-credit-card"></i> Finalizar Pedido
            </a>
          </div>
        </div>
      `
    }

    // Mostrar pedidos históricos
    if (allUserOrders.length > 0) {
      console.log("Renderizando", allUserOrders.length, "pedidos históricos")

      // Ordenar pedidos por fecha (más recientes primero)
      const sortedOrders = [...allUserOrders].sort((a, b) => {
        // Priorizar pedidos con createdAt de Firebase
        if (a.createdAt && b.createdAt) {
          const dateA = a.createdAt.seconds ? new Date(a.createdAt.seconds * 1000) : new Date(a.createdAt)
          const dateB = b.createdAt.seconds ? new Date(b.createdAt.seconds * 1000) : new Date(b.createdAt)
          return dateB - dateA
        }
        // Fallback a ID
        return (b.id || 0) - (a.id || 0)
      })

      content += sortedOrders
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

          const orderId = order.id || order.firebaseId || "N/A"
          const orderStatus = order.status || "pendiente"
          const orderTotal = order.total || 0
          const orderItems = order.items || []

          return `
            <div class="order-card">
              <div class="order-header">
                <div class="order-info">
                  <h3>📦 Pedido #${orderId}</h3>
                  <p><i class="fas fa-calendar-alt"></i> ${orderDate}</p>
                  <p><i class="fas fa-map-marker-alt"></i> ${order.details?.orderType || "Tipo no especificado"}</p>
                  ${order.customerName ? `<p><i class="fas fa-user"></i> ${order.customerName}</p>` : ""}
                  ${order.phone ? `<p><i class="fas fa-phone"></i> ${order.phone}</p>` : ""}
                </div>
                <div class="order-status">
                  <div class="status-badge status-${orderStatus}">
                    <i class="fas fa-${getStatusIcon(orderStatus)}"></i>
                    <span>${getStatusText(orderStatus)}</span>
                  </div>
                  <p class="order-total">$${orderTotal.toLocaleString()}</p>
                </div>
              </div>
              <div class="order-items">
                <h4>Productos pedidos:</h4>
                ${
                  orderItems.length > 0
                    ? orderItems
                        .map(
                          (item) => `
                      <div class="order-item">
                        <span class="order-item-name">${item.name || "Producto"} x${item.quantity || 1}</span>
                        <span class="order-item-price">$${((item.price || 0) * (item.quantity || 1)).toLocaleString()}</span>
                      </div>
                    `,
                        )
                        .join("")
                    : '<p style="color: #6b7280;">No hay productos en este pedido</p>'
                }
              </div>
              <div class="order-actions">
                <button class="btn btn-outline" onclick="viewOrderDetails('${orderId}')">
                  <i class="fas fa-eye"></i> Ver Detalles
                </button>
                ${getStatusMessage(orderStatus)}
              </div>
            </div>
          `
        })
        .join("")
    }

    // Si no hay contenido, mostrar mensaje vacío
    if (content === "") {
      console.log("No hay pedidos ni carrito para mostrar")
      content = `
        <div class="empty-cart">
          <i class="fas fa-box"></i>
          <p>No tienes pedidos aún</p>
          <p style="color: #6b7280; margin-bottom: 1.5rem;">¡Haz tu primer pedido y aparecerá aquí!</p>
          <a href="menu.html" class="btn btn-primary">
            <i class="fas fa-utensils"></i> Ver Menú
          </a>
        </div>
      `
    }

    console.log("Actualizando contenido del DOM...")
    ordersContainer.innerHTML = content
    console.log("=== RENDERIZADO COMPLETADO ===")
  } catch (error) {
    console.error("ERROR al cargar pedidos:", error)
    ordersContainer.innerHTML = `
      <div class="empty-cart">
        <i class="fas fa-exclamation-triangle" style="color: #ef4444;"></i>
        <p>Error al cargar los pedidos</p>
        <p style="color: #6b7280; margin-bottom: 1.5rem;">Hubo un problema al conectar con el servidor</p>
        <button class="btn btn-primary" onclick="renderOrders()">
          <i class="fas fa-redo"></i> Reintentar
        </button>
      </div>
    `
    showNotification("Error al cargar los pedidos: " + error.message, "error")
  }
}

function getStatusIcon(status) {
  switch (status) {
    case "pendiente":
      return "clock"
    case "preparando":
      return "fire"
    case "listo":
      return "check-circle"
    case "entregado":
      return "truck"
    default:
      return "clock"
  }
}

function getStatusText(status) {
  switch (status) {
    case "pendiente":
      return "Pendiente"
    case "preparando":
      return "Preparando"
    case "listo":
      return "Listo"
    case "entregado":
      return "Entregado"
    default:
      return "Pendiente"
  }
}

function getStatusMessage(status) {
  switch (status) {
    case "listo":
      return `
        <div class="order-status-info status-info-ready">
          <i class="fas fa-check-circle"></i>
          ¡Tu pedido está listo para recoger!
        </div>
      `
    case "preparando":
      return `
        <div class="order-status-info status-info-preparing">
          <i class="fas fa-clock"></i>
          Tu pedido se está preparando...
        </div>
      `
    default:
      return ""
  }
}

async function viewOrderDetails(orderId) {
  console.log("Viendo detalles del pedido:", orderId)

  const user = JSON.parse(localStorage.getItem("currentUser") || "null")
  if (!user || !user.email) {
    showNotification("Debes iniciar sesión para ver los detalles", "error")
    return
  }

  try {
    // Buscar en Firebase primero
    const result = await getOrdersByUser(user.email)
    let order = null

    if (result.success && result.orders) {
      order = result.orders.find((o) => (o.id || o.firebaseId) === orderId)
    }

    // Si no se encuentra en Firebase, buscar en localStorage
    if (!order) {
      const allOrders = JSON.parse(localStorage.getItem("orders") || "{}")
      let userOrders = []

      if (Array.isArray(allOrders)) {
        userOrders = allOrders.filter((order) => order.customerEmail === user.email || order.userEmail === user.email)
      } else {
        userOrders = allOrders[user.email] || []
      }

      order = userOrders.find((o) => o.id === orderId)
    }

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

    const orderDetails = `
🧾 DETALLES DEL PEDIDO #${order.id || "N/A"}

📅 Fecha: ${orderDate}
👤 Cliente: ${order.customerName || "N/A"}
📱 Teléfono: ${order.phone || "N/A"}
📍 Estado: ${getStatusText(order.status || "pendiente")}
💰 Total: $${(order.total || 0).toLocaleString()}

🍽️ PRODUCTOS:
${(order.items || [])
  .map(
    (item, index) =>
      `${index + 1}. ${item.name || "Producto"} x${item.quantity || 1} = $${((item.price || 0) * (item.quantity || 1)).toLocaleString()}`,
  )
  .join("\n")}

📋 DETALLES DEL PEDIDO:
• Tipo: ${order.details?.orderType || "N/A"}
• Método de pago: ${order.details?.paymentMethod || "N/A"}
${order.details?.address ? `• Dirección: ${order.details.address}` : ""}
${order.details?.tip ? `• Propina: $${order.details.tip.toLocaleString()}` : ""}
${order.details?.arrivalTime ? `• Hora de llegada: ${order.details.arrivalTime}` : ""}
    `

    const modal = document.createElement("div")
    modal.className = "modal"
    modal.style.display = "flex"
    modal.innerHTML = `<div class="modal-content customer-order-modal"><button class="close">&times;</button><h2>Pedido #${order.id || order.firebaseId || "N/A"}</h2><div class="customer-order-meta"><p><strong>Cliente:</strong> ${order.customerName || "N/A"}</p><p><strong>Teléfono:</strong> ${order.phone || "N/A"}</p><p><strong>Tipo:</strong> ${order.details?.orderType || "N/A"}</p><p><strong>Pago:</strong> ${order.details?.paymentMethod || "N/A"}</p><p><strong>Fecha:</strong> ${orderDate}</p><p><strong>Estado:</strong> ${getStatusText(order.status || "pendiente")}</p></div><div class="customer-order-products">${(order.items || []).map((item) => `<div><span>${item.name || "Producto"} x${item.quantity || 1}<small>$${Number(item.price || 0).toLocaleString()} c/u</small></span><strong>$${(Number(item.price || 0) * Number(item.quantity || 1)).toLocaleString()}</strong></div>`).join("") || "Sin productos"}</div><p class="customer-order-total">Total: $${Number(order.total || 0).toLocaleString()}</p></div>`
    document.body.appendChild(modal)
    modal.querySelector(".close").addEventListener("click", () => modal.remove())
    modal.addEventListener("click", (event) => { if (event.target === modal) modal.remove() })
  } catch (error) {
    console.error("Error al ver detalles del pedido:", error)
    showNotification("Error al cargar los detalles del pedido", "error")
  }
}

// Hacer las funciones globales
window.viewOrderDetails = viewOrderDetails
window.renderOrders = renderOrders

document.addEventListener("DOMContentLoaded", async () => {
  console.log("=== ORDERS.JS CARGADO ===")

  const user = JSON.parse(localStorage.getItem("currentUser") || "null")
  console.log("Usuario en DOMContentLoaded:", user)

  if (!user) {
    console.log("No hay usuario, redirigiendo a login")
    window.location.href = "inicioSesion.html"
    return
  }

  console.log("Usuario válido, cargando pedidos...")

  // Cargar pedidos
  try {
    await renderOrders()
  } catch (error) {
    console.error("Error al cargar pedidos en DOMContentLoaded:", error)
    showNotification("Error al cargar la página", "error")
  }

  // Configurar botón de logout
  const logoutBtn = document.getElementById("logoutBtn")
  if (logoutBtn) {
    logoutBtn.addEventListener("click", () => {
      console.log("Cerrando sesión...")
      localStorage.removeItem("currentUser")
      localStorage.removeItem("currentUserEmail")
      localStorage.removeItem("cart")
      showNotification("Sesión cerrada correctamente", "success")
      setTimeout(() => {
        window.location.href = "inicioSesion.html"
      }, 1000)
    })
  }
})

