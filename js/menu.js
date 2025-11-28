import { getAllProducts, saveProduct } from "./firebase.js"

let menuData = {}
let products = []

// --------------------------------------------
// CARRITO Y FUNCIONES RELACIONADAS
// --------------------------------------------

let cart = JSON.parse(localStorage.getItem("cart") || "[]")

function saveCart() {
  localStorage.setItem("cart", JSON.stringify(cart))
  updateCartUI()
}

function addToCart(productId, observation = "") {
  const product = findProductById(productId)
  if (!product) {
    showNotification("Producto no encontrado", "error")
    return
  }

  const existingItem = cart.find((item) => item.id === product.id)

  if (existingItem) {
    existingItem.quantity += 1
    if (observation) existingItem.observation = observation
  } else {
    cart.push({ ...product, quantity: 1, observation })
  }

  saveCart()
  showNotification(`${product.name} agregado al carrito`, "success")
}

function removeFromCart(productId) {
  const existingItem = cart.find((item) => item.id === productId)

  if (existingItem) {
    if (existingItem.quantity > 1) {
      existingItem.quantity -= 1
    } else {
      cart = cart.filter((item) => item.id !== productId)
    }
    saveCart()
  }
}

function getTotalItems() {
  return cart.reduce((total, item) => total + item.quantity, 0)
}

function getTotalPrice() {
  return cart.reduce((total, item) => total + item.price * item.quantity, 0)
}

function updateCartUI() {
  const cartBadge = document.getElementById("cartBadge")
  const cartPreview = document.getElementById("cartPreview")
  const cartItemCount = document.getElementById("cartItemCount")
  const cartSubtotal = document.getElementById("cartSubtotal")

  const totalItems = getTotalItems()
  const totalPrice = getTotalPrice()

  cartBadge.textContent = totalItems > 0 ? totalItems : ""
  cartBadge.style.display = totalItems > 0 ? "flex" : "none"

  if (totalItems > 0) {
    cartPreview.style.display = "block"
    cartItemCount.textContent = `${totalItems} producto${totalItems > 1 ? "s" : ""} - $${totalPrice.toLocaleString()}`
    cartSubtotal.textContent = `Total: $${totalPrice.toLocaleString()}`
  } else {
    cartPreview.style.display = "none"
  }
}

// --------------------------------------------
// CARGA DE PRODUCTOS DESDE FIREBASE
// --------------------------------------------

async function loadProductsFromFirebase() {
  try {
    console.log("=== INICIANDO CARGA DE PRODUCTOS ===")

    // Primero intentar obtener productos existentes
    console.log("1. Obteniendo productos existentes...")
    const result = await getAllProducts()

    if (result.success) {
      console.log("2. Productos encontrados:", result.products.length)

      if (result.products.length === 0) {
        console.log("3. No hay productos, inicializando productos por defecto...")

        // Crear productos por defecto directamente
        const defaultProducts = [
          {
            name: "Empanadas Criollas",
            price: 8500,
            description: "Deliciosas empanadas rellenas de carne, pollo o queso",
            image: "https://images.unsplash.com/photo-1529006557810-274b9b2fc783?w=300&h=200&fit=crop",
            category: "Entradas",
          },
          {
            name: "Arepas Rellenas",
            price: 12000,
            description: "Arepas tradicionales con diversos rellenos",
            image: "https://images.unsplash.com/photo-1544025162-d76694265947?w=300&h=200&fit=crop",
            category: "Entradas",
          },
          {
            name: "Bandeja Paisa",
            price: 25000,
            description: "Plato típico con frijoles, arroz, carne, chorizo, huevo y más",
            image: "https://upload.wikimedia.org/wikipedia/commons/1/12/Bandepaisabog.JPG",
            category: "Platos Principales",
          },
          {
            name: "Pollo a la Plancha",
            price: 18000,
            description: "Pechuga de pollo jugosa con guarnición",
            image: "https://images.unsplash.com/photo-1598103442097-8b74394b95c6?w=300&h=200&fit=crop",
            category: "Platos Principales",
          },
          {
            name: "Jugo Natural",
            price: 5000,
            description: "Jugos frescos de frutas naturales",
            image: "https://images.unsplash.com/photo-1613478223719-2ab802602423?w=300&h=200&fit=crop",
            category: "Bebidas",
          },
          {
            name: "Gaseosa",
            price: 3500,
            description: "Bebidas gaseosas variadas",
            image: "https://images.unsplash.com/photo-1581636625402-29b2a704ef13?w=300&h=200&fit=crop",
            category: "Bebidas",
          },
        ]

        // Agregar cada producto
        for (const product of defaultProducts) {
          try {
            console.log("Agregando producto:", product.name)
            const saveResult = await saveProduct(product)
            if (saveResult.success) {
              console.log("✅ Producto agregado:", product.name)
            } else {
              console.error("❌ Error al agregar producto:", product.name, saveResult.error)
            }
          } catch (error) {
            console.error("❌ Error al agregar producto:", product.name, error)
          }
        }

        // Volver a obtener productos después de agregarlos
        console.log("4. Obteniendo productos después de inicializar...")
        const newResult = await getAllProducts()
        if (newResult.success) {
          products = newResult.products
          console.log("5. Productos finales cargados:", products.length)
        }
      } else {
        products = result.products
        console.log("3. Usando productos existentes:", products.length)
      }
    } else {
      console.error("Error al obtener productos:", result.error)
      // Como fallback, usar productos locales temporalmente
      products = getLocalFallbackProducts()
      console.log("Usando productos de fallback:", products.length)
    }

    menuData = groupProductsByCategory(products)
    console.log("=== CARGA COMPLETADA ===")
    return true
  } catch (error) {
    console.error("Error crítico al cargar productos:", error)
    // Usar productos de fallback en caso de error
    products = getLocalFallbackProducts()
    menuData = groupProductsByCategory(products)
    showNotification("Usando menú de respaldo debido a problemas de conexión", "info")
    return true
  }
}

// Función de fallback con productos locales
function getLocalFallbackProducts() {
  return [
    {
      id: "fallback-1",
      name: "Empanadas Criollas",
      price: 8500,
      description: "Deliciosas empanadas rellenas de carne, pollo o queso",
      image: "https://images.unsplash.com/photo-1529006557810-274b9b2fc783?w=300&h=200&fit=crop",
      category: "Entradas",
    },
    {
      id: "fallback-2",
      name: "Arepas Rellenas",
      price: 12000,
      description: "Arepas tradicionales con diversos rellenos",
      image: "https://images.unsplash.com/photo-1544025162-d76694265947?w=300&h=200&fit=crop",
      category: "Entradas",
    },
    {
      id: "fallback-3",
      name: "Bandeja Paisa",
      price: 25000,
      description: "Plato típico con frijoles, arroz, carne, chorizo, huevo y más",
      image: "https://upload.wikimedia.org/wikipedia/commons/1/12/Bandepaisabog.JPG",
      category: "Platos Principales",
    },
    {
      id: "fallback-4",
      name: "Pollo a la Plancha",
      price: 18000,
      description: "Pechuga de pollo jugosa con guarnición",
      image: "https://images.unsplash.com/photo-1598103442097-8b74394b95c6?w=300&h=200&fit=crop",
      category: "Platos Principales",
    },
    {
      id: "fallback-5",
      name: "Jugo Natural",
      price: 5000,
      description: "Jugos frescos de frutas naturales",
      image: "https://images.unsplash.com/photo-1613478223719-2ab802602423?w=300&h=200&fit=crop",
      category: "Bebidas",
    },
    {
      id: "fallback-6",
      name: "Gaseosa",
      price: 3500,
      description: "Bebidas gaseosas variadas",
      image: "https://images.unsplash.com/photo-1581636625402-29b2a704ef13?w=300&h=200&fit=crop",
      category: "Bebidas",
    },
  ]
}

// Función para agrupar productos por categoría
function groupProductsByCategory(products) {
  const grouped = {}
  products.forEach((product) => {
    if (!grouped[product.category]) {
      grouped[product.category] = []
    }
    grouped[product.category].push(product)
  })
  return grouped
}

// --------------------------------------------
// MENÚ
// --------------------------------------------

// Renderizar el menú con el estilo actualizado según la imagen de referencia
function renderMenu(filteredProducts = products) {
  const menuContainer = document.getElementById("menuContainer")
  menuContainer.innerHTML = ""

  if (filteredProducts.length === 0) {
    menuContainer.innerHTML = `
      <div style="text-align: center; padding: 4rem 2rem; background: rgba(255, 255, 255, 0.9); border-radius: 1rem; margin: 2rem 0; box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1);">
        <i class="fas fa-utensils" style="font-size: 4rem; color: #ef4444; margin-bottom: 1rem;"></i>
        <h2 style="color: #374151; margin-bottom: 1rem;">¡Menú en Preparación!</h2>
        <p style="color: #6b7280; margin-bottom: 2rem; max-width: 500px; margin-left: auto; margin-right: auto;">
          Estamos preparando nuestro delicioso menú con los mejores ingredientes. 
          Los productos aparecerán aquí muy pronto.
        </p>
        <div style="background: #fef3c7; border: 1px solid #fbbf24; border-radius: 0.5rem; padding: 1rem; margin-top: 1rem; max-width: 600px; margin-left: auto; margin-right: auto;">
          <p style="color: #92400e; margin: 0;">
            <i class="fas fa-info-circle"></i> 
            Si eres administrador, puedes agregar productos desde el panel de administración.
          </p>
        </div>
        <button onclick="window.location.reload()" class="btn btn-primary" style="margin-top: 1rem; display: inline-flex; align-items: center; gap: 0.5rem;">
          <i class="fas fa-redo"></i>
          Recargar Página
        </button>
      </div>
    `
    return
  }

  const groupedData = groupProductsByCategory(filteredProducts)
  Object.entries(groupedData).forEach(([category, products]) => {
    const categorySection = document.createElement("div")
    categorySection.className = "category-section fade-in"

    categorySection.innerHTML = `
      <h2 class="category-title">${category}</h2>
      <div class="menu-grid">
        ${products
          .map(
            (product) => `
            <div class="product-card">
              <div style="position: relative;">
                <img src="${product.image}" alt="${product.name}" class="product-image" onclick="showProductModal('${product.id}')" onerror="this.src='https://images.unsplash.com/photo-1565299624946-b28f40a0ca4b?w=300&h=200&fit=crop'">
                <div class="product-rating">
                  <i class="fas fa-star"></i>
                  4.5
                </div>
              </div>
              <div class="product-info">
                <h3 class="product-name">${product.name}</h3>
                <p class="product-description">${product.description}</p>
                <div class="product-footer">
                  <span class="product-price">$${product.price.toLocaleString()}</span>
                  <div class="product-actions">
                    <button class="btn btn-outline btn-sm" onclick="showProductModal('${product.id}')">
                      Ver Detalles
                    </button>
                    <button class="btn btn-success btn-sm" onclick="addToCart('${product.id}')">
                      <i class="fas fa-plus"></i>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          `,
          )
          .join("")}
      </div>
    `

    menuContainer.appendChild(categorySection)
  })
}

function showProductModal(productId) {
  const product = findProductById(productId)
  if (!product) return

  const modal = document.getElementById("productModal")
  const modalContent = document.getElementById("modalContent")

  modalContent.innerHTML = `
    <h2 style="font-size: 1.5rem; font-weight: 600; margin-bottom: 0.5rem;">${product.name}</h2>
    <p style="color: #6b7280; margin-bottom: 1rem;">${product.description}</p>
    <img src="${product.image}" alt="${product.name}" style="width: 100%; height: 12rem; object-fit: cover; border-radius: 0.5rem; margin-bottom: 1rem;" onerror="this.src='https://images.unsplash.com/photo-1565299624946-b28f40a0ca4b?w=300&h=200&fit=crop'">
    <label for="observation" style="display: block; margin-bottom: 0.5rem;">Observación (opcional):</label>
    <textarea id="observation" style="width: 100%; height: 4rem; margin-bottom: 1rem; padding: 0.5rem; border-radius: 0.5rem; border: 1px solid #d1d5db;"></textarea>
    <div style="display: flex; align-items: center; justify-content: space-between;">
      <span style="font-size: 1.875rem; font-weight: bold; color: #059669;">$${product.price.toLocaleString()}</span>
      <button class="btn btn-success" onclick="addToCart('${product.id}', document.getElementById('observation').value); closeModal()">
        Agregar al Carrito
      </button>
    </div>
  `

  modal.classList.add("show")
}

function closeModal() {
  const modal = document.getElementById("productModal")
  modal.classList.remove("show")
}

function findProductById(id) {
  return products.find((p) => p.id === id)
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

function filterProducts() {
  const searchTerm = document.getElementById("searchInput").value.toLowerCase()
  const categoryFilter = document.getElementById("categoryFilter").value

  const filteredProducts = products.filter((product) => {
    const matchesSearch = product.name.toLowerCase().includes(searchTerm)
    const matchesCategory = !categoryFilter || product.category === categoryFilter
    return matchesSearch && matchesCategory
  })

  renderMenu(filteredProducts)
}

// Hacer funciones globales
window.addToCart = addToCart
window.showProductModal = showProductModal
window.closeModal = closeModal
window.filterProducts = filterProducts

// Verificar usuario autenticado al cargar la página
document.addEventListener("DOMContentLoaded", async () => {
  console.log("=== CARGANDO MENÚ ===")

  // Mostrar loading mientras carga
  const menuContainer = document.getElementById("menuContainer")
  menuContainer.innerHTML = `
    <div style="text-align: center; padding: 4rem 2rem; background: rgba(255, 255, 255, 0.9); border-radius: 1rem; margin: 2rem 0; box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1);">
      <i class="fas fa-spinner fa-spin" style="font-size: 3rem; color: #ef4444; margin-bottom: 1rem;"></i>
      <h2 style="color: #374151; margin-bottom: 0.5rem;">Cargando Menú...</h2>
      <p style="color: #6b7280;">Obteniendo los productos más frescos para ti</p>
      <div style="background: #e0f2fe; border: 1px solid #0288d1; border-radius: 0.5rem; padding: 1rem; margin-top: 1rem; max-width: 500px; margin-left: auto; margin-right: auto;">
        <p style="color: #01579b; margin: 0; font-size: 0.875rem;">
          <i class="fas fa-database"></i> 
          Conectando con la base de datos...
        </p>
      </div>
    </div>
  `

  const existingUsers = JSON.parse(localStorage.getItem("restaurantUsers") || "[]")
  const currentUser = JSON.parse(localStorage.getItem("currentUser") || "null")
  const currentUserEmail = localStorage.getItem("currentUserEmail")
  const userInfo = document.getElementById("userInfo")
  const guestInfo = document.getElementById("guestInfo")
  const adminBtn = document.getElementById("adminBtn")
  const userName = document.getElementById("userName")
  const logoutBtn = document.getElementById("logoutBtn")

  console.log("Estado de sesión:", { currentUser, currentUserEmail })

  try {
    // Cargar productos desde Firebase
    console.log("Iniciando carga de productos...")
    const productsLoaded = await loadProductsFromFirebase()

    console.log("Productos cargados:", products.length)

    if (productsLoaded && products.length > 0) {
      // Agregar filtros dinámicamente
      const categoryFilter = document.getElementById("categoryFilter")
      const categories = Array.from(new Set(products.map((p) => p.category)))

      // Limpiar opciones existentes excepto "Todas las categorías"
      categoryFilter.innerHTML = '<option value="">Todas las categorías</option>'

      categories.forEach((category) => {
        const option = document.createElement("option")
        option.value = category
        option.textContent = category
        categoryFilter.appendChild(option)
      })

      // Renderizar el menú
      renderMenu()

      showNotification(`¡Menú cargado! ${products.length} productos disponibles`, "success")
    } else {
      // Si no hay productos, mostrar mensaje
      menuContainer.innerHTML = `
        <div style="text-align: center; padding: 4rem 2rem; background: rgba(255, 255, 255, 0.9); border-radius: 1rem; margin: 2rem 0; box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1);">
          <i class="fas fa-utensils" style="font-size: 4rem; color: #ef4444; margin-bottom: 1rem;"></i>
          <h2 style="color: #374151; margin-bottom: 1rem;">Menú Temporalmente No Disponible</h2>
          <p style="color: #6b7280; margin-bottom: 2rem;">
            Estamos experimentando problemas técnicos. Por favor, recarga la página o intenta más tarde.
          </p>
          <button onclick="window.location.reload()" class="btn btn-primary" style="display: inline-flex; align-items: center; gap: 0.5rem;">
            <i class="fas fa-redo"></i>
            Recargar Página
          </button>
        </div>
      `
    }
  } catch (error) {
    console.error("Error crítico al cargar el menú:", error)
    menuContainer.innerHTML = `
      <div style="text-align: center; padding: 4rem 2rem; background: rgba(255, 255, 255, 0.9); border-radius: 1rem; margin: 2rem 0; box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1);">
        <i class="fas fa-exclamation-triangle" style="font-size: 4rem; color: #ef4444; margin-bottom: 1rem;"></i>
        <h2 style="color: #374151; margin-bottom: 1rem;">Error al Cargar el Menú</h2>
        <p style="color: #6b7280; margin-bottom: 2rem;">
          Hubo un problema al conectar con nuestros servidores. Por favor, intenta recargar la página.
        </p>
        <div style="background: #fef2f2; border: 1px solid #ef4444; border-radius: 0.5rem; padding: 1rem; margin: 1rem 0; max-width: 500px; margin-left: auto; margin-right: auto;">
          <p style="color: #dc2626; margin: 0; font-size: 0.875rem;">
            <i class="fas fa-exclamation-circle"></i> 
            Error técnico: ${error.message}
          </p>
        </div>
        <button onclick="window.location.reload()" class="btn btn-primary" style="display: inline-flex; align-items: center; gap: 0.5rem;">
          <i class="fas fa-redo"></i>
          Recargar Página
        </button>
      </div>
    `
    showNotification("Error al cargar el menú. Intenta recargar la página.", "error")
  }

  // Actualizar carrito
  updateCartUI()

  // Verificar si hay un usuario logueado
  if (currentUser) {
    console.log("Usuario autenticado:", currentUser)
    guestInfo.style.display = "none"
    userInfo.style.display = "flex"
    userName.textContent = `¡Hola! ${currentUser.name}`

    if (currentUser.isAdmin) {
      adminBtn.style.display = "block"
      userName.textContent = `¡Hola! ${currentUser.name} (Admin)`
    } else {
      adminBtn.style.display = "none"
    }
  } else {
    console.log("No hay usuario autenticado")
    userInfo.style.display = "none"
    guestInfo.style.display = "block"
    adminBtn.style.display = "none"
  }

  // Rest of the event listeners remain the same...
  const modal = document.getElementById("productModal")
  const closeBtn = document.querySelector(".close")
  const confirmModal = document.getElementById("confirmModal")

  if (closeBtn) {
    closeBtn.addEventListener("click", closeModal)
  }

  if (modal) {
    modal.addEventListener("click", (e) => {
      if (e.target === modal) {
        closeModal()
      }
    })
  }

  if (logoutBtn) {
    logoutBtn.addEventListener("click", (e) => {
      e.preventDefault()
      console.log("Botón logout clickeado")
      if (confirmModal) {
        console.log("Mostrando modal de confirmación")
        confirmModal.style.display = "flex"
        confirmModal.classList.add("show")
      }
    })
  }

  const cancelLogout = document.getElementById("cancelLogout")
  const confirmLogout = document.getElementById("confirmLogout")

  if (cancelLogout) {
    cancelLogout.addEventListener("click", (e) => {
      e.preventDefault()
      console.log("Cancelando logout")
      if (confirmModal) {
        confirmModal.style.display = "none"
        confirmModal.classList.remove("show")
      }
    })
  }

  if (confirmLogout) {
    confirmLogout.addEventListener("click", (e) => {
      e.preventDefault()
      console.log("Confirmando logout")
      localStorage.removeItem("currentUser")
      localStorage.removeItem("currentUserEmail")
      localStorage.removeItem("cart")
      userInfo.style.display = "none"
      guestInfo.style.display = "block"
      adminBtn.style.display = "none"
      if (confirmModal) {
        confirmModal.style.display = "none"
        confirmModal.classList.remove("show")
      }
      showNotification("Has cerrado sesión exitosamente", "success")
      setTimeout(() => {
        window.location.href = "menu.html"
      }, 1000)
    })
  }

  if (confirmModal) {
    confirmModal.addEventListener("click", (e) => {
      if (e.target === confirmModal) {
        console.log("Clickeando fuera del modal")
        confirmModal.style.display = "none"
        confirmModal.classList.remove("show")
      }
    })
  }

  console.log("=== MENÚ CARGADO ===")
})
