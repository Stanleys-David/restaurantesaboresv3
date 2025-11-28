import { saveOrder } from "./firebase.js"

let cart = JSON.parse(localStorage.getItem("cart") || "[]")

function saveCart() {
  localStorage.setItem("cart", JSON.stringify(cart))
}

function updateQuantity(id, change) {
  const item = cart.find((item) => item.id === id)
  if (item) {
    item.quantity += change
    if (item.quantity <= 0) {
      cart = cart.filter((item) => item.id !== id)
    }
    saveCart()
    renderCartItems()
    updateOrderSummary()
  }
}

function removeItem(id) {
  cart = cart.filter((item) => item.id !== id)
  saveCart()
  renderCartItems()
  updateOrderSummary()
}

function renderCartItems() {
  const cartItemsContainer = document.getElementById("cartItemsContainer")
  const orderForm = document.getElementById("orderForm")

  if (cart.length === 0) {
    cartItemsContainer.innerHTML = `
            <div class="empty-cart">
                <i class="fas fa-shopping-cart"></i>
                <p>Tu carrito está vacío</p>
                <a href="menu.html" class="btn btn-primary">Ir al Menú</a>
            </div>
        `
    orderForm.style.display = "none"
    return
  }

  cartItemsContainer.innerHTML = cart
    .map(
      (item) => `
        <div class="cart-item">
            <img src="${item.image}" alt="${item.name}" class="cart-item-image">
            <div class="cart-item-info">
                <h3 class="cart-item-name">${item.name}</h3>
                <p class="cart-item-price">$${item.price.toLocaleString()}</p>
                ${item.observation ? `<p class="cart-item-observation">${item.observation}</p>` : ""}
            </div>
            <div class="quantity-controls">
                <button class="quantity-btn" onclick="updateQuantity(${item.id}, -1)">
                    <i class="fas fa-minus"></i>
                </button>
                <span class="quantity">${item.quantity}</span>
                <button class="quantity-btn" onclick="updateQuantity(${item.id}, 1)">
                    <i class="fas fa-plus"></i>
                </button>
                <button class="remove-btn" onclick="removeItem(${item.id})">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
            <div class="cart-item-total">
                $${(item.price * item.quantity).toLocaleString()}
            </div>
        </div>
    `,
    )
    .join("")

  orderForm.style.display = "block"
  updateOrderSummary()
}

function updateOrderSummary() {
  const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0)
  const tip = Number.parseInt(document.getElementById("tip")?.value) || 0
  const total = subtotal + tip

  document.getElementById("subtotal").textContent = `$${subtotal.toLocaleString()}`
  document.getElementById("tipAmount").textContent = `$${tip.toLocaleString()}`
  document.getElementById("total").textContent = `$${total.toLocaleString()}`
}

function showNotification(message, type = "info") {
  const notification = document.getElementById("notification")
  notification.textContent = message
  notification.className = `notification ${type}`
  notification.classList.add("show")
  setTimeout(() => {
    notification.classList.remove("show")
  }, 3000)
}

async function placeOrder() {
  console.log("Iniciando proceso de pedido...")

  const user = JSON.parse(localStorage.getItem("currentUser") || "null")
  console.log("Usuario actual:", user)

  if (!user || !user.email) {
    showNotification("Debes iniciar sesión para realizar un pedido", "error")
    setTimeout(() => (window.location.href = "inicioSesion.html"), 2000)
    return
  }

  const orderDetails = {
    name: document.getElementById("customerName").value,
    phone: document.getElementById("customerPhone").value,
    address: document.getElementById("customerAddress").value,
    arrivalTime: document.getElementById("arrivalTime").value,
    orderType: document.getElementById("orderType").value,
    paymentMethod: document.getElementById("paymentMethod").value,
    tip: Number.parseInt(document.getElementById("tip").value) || 0,
  }

  console.log("Detalles del pedido:", orderDetails)

  if (!orderDetails.name || !orderDetails.phone) {
    showNotification("Por favor completa los campos obligatorios", "error")
    return
  }

  if (orderDetails.orderType === "domicilio" && !orderDetails.address) {
    showNotification("Por favor ingresa la dirección de entrega", "error")
    return
  }

  const total = cart.reduce((sum, item) => sum + item.price * item.quantity, 0) + orderDetails.tip
  const order = {
    customerName: orderDetails.name,
    customerEmail: user.email,
    userEmail: user.email,
    phone: orderDetails.phone,
    items: cart.map((item) => ({ ...item })),
    details: orderDetails,
    total: total,
    status: "pendiente",
    date: new Date().toLocaleString(),
  }

  console.log("Pedido creado:", order)

  try {
    // Guardar pedido en Firebase
    const result = await saveOrder(order)

    if (result.success) {
      console.log("Pedido guardado en Firebase con ID:", result.id)

      // Limpiar carrito
      cart = []
      localStorage.setItem("cart", JSON.stringify(cart))
      console.log("Carrito limpiado")

      showNotification("¡Pedido realizado con éxito!", "success")
      setTimeout(() => (window.location.href = "orders.html"), 2000)
    } else {
      console.error("Error al guardar pedido:", result.error)
      showNotification("Error al procesar el pedido: " + result.error, "error")
    }
  } catch (error) {
    console.error("Error al procesar pedido:", error)
    showNotification("Error al procesar el pedido. Intenta nuevamente.", "error")
  }
}

// Hacer la función global para que funcione con onclick
window.updateQuantity = updateQuantity
window.removeItem = removeItem

document.addEventListener("DOMContentLoaded", () => {
  const user = JSON.parse(localStorage.getItem("currentUser") || "null")
  if (user) {
    document.getElementById("customerName").value = user.name || ""
    document.getElementById("logoutBtn").style.display = "inline-flex"
  }

  renderCartItems()

  document.getElementById("orderType").addEventListener("change", function () {
    const type = this.value
    const address = document.getElementById("customerAddress")
    const arrivalTime = document.getElementById("arrivalTime")

    address.style.display = type === "domicilio" ? "block" : "none"
    address.required = type === "domicilio"

    arrivalTime.style.display = type === "llevar" ? "block" : "none"
    arrivalTime.required = type === "llevar"
  })

  document.getElementById("tip").addEventListener("input", updateOrderSummary)
  document.getElementById("placeOrderBtn").addEventListener("click", placeOrder)

  document.getElementById("logoutBtn").addEventListener("click", () => {
    localStorage.removeItem("currentUser")
    localStorage.removeItem("cart")
    showNotification("Sesión cerrada correctamente", "success")
    setTimeout(() => {
      window.location.href = "inicioSesion.html"
    }, 1000)
  })
})
