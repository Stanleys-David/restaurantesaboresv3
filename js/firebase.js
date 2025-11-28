// Configuración de Firebase
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.9.0/firebase-app.js"
import {
  getFirestore,
  collection,
  addDoc,
  getDocs,
  doc,
  updateDoc,
  deleteDoc,
  query,
  where,
} from "https://www.gstatic.com/firebasejs/11.9.0/firebase-firestore.js"

const firebaseConfig = {
  apiKey: "AIzaSyBYSC5Ut97m3Ah5dLr4AM4Ed5r13_KS7Fg",
  authDomain: "restaurantesabores-a8d5e.firebaseapp.com",
  projectId: "restaurantesabores-a8d5e",
  storageBucket: "restaurantesabores-a8d5e.firebasestorage.app",
  messagingSenderId: "847705836289",
  appId: "1:847705836289:web:8962067b4501f8d437a900",
  measurementId: "G-TFFPSRP2N8",
}

// Inicializar Firebase
const app = initializeApp(firebaseConfig)
const db = getFirestore(app)

// ==========================================
// FUNCIONES PARA USUARIOS
// ==========================================

export async function saveUser(userData) {
  try {
    const docRef = await addDoc(collection(db, "users"), {
      ...userData,
      createdAt: new Date(),
      isAdmin: false,
    })
    console.log("Usuario guardado con ID:", docRef.id)
    return { success: true, id: docRef.id }
  } catch (error) {
    console.error("Error al guardar usuario:", error)
    return { success: false, error: error.message }
  }
}

export async function getUserByEmail(email) {
  try {
    const q = query(collection(db, "users"), where("email", "==", email))
    const querySnapshot = await getDocs(q)

    if (!querySnapshot.empty) {
      const doc = querySnapshot.docs[0]
      return { success: true, user: { id: doc.id, ...doc.data() } }
    } else {
      return { success: false, error: "Usuario no encontrado" }
    }
  } catch (error) {
    console.error("Error al buscar usuario:", error)
    return { success: false, error: error.message }
  }
}

export async function getAllUsers() {
  try {
    const querySnapshot = await getDocs(collection(db, "users"))
    const users = []
    querySnapshot.forEach((doc) => {
      users.push({ id: doc.id, ...doc.data() })
    })
    return { success: true, users }
  } catch (error) {
    console.error("Error al obtener usuarios:", error)
    return { success: false, error: error.message }
  }
}

// ==========================================
// FUNCIONES PARA PRODUCTOS
// ==========================================

export async function saveProduct(productData) {
  try {
    const docRef = await addDoc(collection(db, "products"), {
      ...productData,
      createdAt: new Date(),
    })
    console.log("Producto guardado con ID:", docRef.id)
    return { success: true, id: docRef.id }
  } catch (error) {
    console.error("Error al guardar producto:", error)
    return { success: false, error: error.message }
  }
}

export async function getAllProducts() {
  try {
    const querySnapshot = await getDocs(collection(db, "products"))
    const products = []
    querySnapshot.forEach((doc) => {
      products.push({ id: doc.id, ...doc.data() })
    })
    return { success: true, products }
  } catch (error) {
    console.error("Error al obtener productos:", error)
    return { success: false, error: error.message }
  }
}

export async function updateProduct(productId, productData) {
  try {
    const productRef = doc(db, "products", productId)
    await updateDoc(productRef, {
      ...productData,
      updatedAt: new Date(),
    })
    console.log("Producto actualizado:", productId)
    return { success: true }
  } catch (error) {
    console.error("Error al actualizar producto:", error)
    return { success: false, error: error.message }
  }
}

export async function deleteProduct(productId) {
  try {
    await deleteDoc(doc(db, "products", productId))
    console.log("Producto eliminado:", productId)
    return { success: true }
  } catch (error) {
    console.error("Error al eliminar producto:", error)
    return { success: false, error: error.message }
  }
}

// ==========================================
// FUNCIONES PARA PEDIDOS
// ==========================================

export async function saveOrder(orderData) {
  try {
    const docRef = await addDoc(collection(db, "orders"), {
      ...orderData,
      createdAt: new Date(),
    })
    console.log("Pedido guardado con ID:", docRef.id)
    return { success: true, id: docRef.id }
  } catch (error) {
    console.error("Error al guardar pedido:", error)
    return { success: false, error: error.message }
  }
}

export async function getOrdersByUser(userEmail) {
  try {
    console.log("Buscando pedidos para:", userEmail)

    // Consulta simple sin ordenamiento (para evitar el error del índice)
    const q = query(collection(db, "orders"), where("customerEmail", "==", userEmail))
    const querySnapshot = await getDocs(q)

    const orders = []
    querySnapshot.forEach((doc) => {
      const orderData = doc.data()
      orders.push({
        firebaseId: doc.id,
        id: orderData.id || doc.id,
        ...orderData,
      })
    })

    // Ordenar en JavaScript después de obtener los datos
    orders.sort((a, b) => {
      const dateA = a.createdAt
        ? a.createdAt.seconds
          ? new Date(a.createdAt.seconds * 1000)
          : new Date(a.createdAt)
        : new Date(0)
      const dateB = b.createdAt
        ? b.createdAt.seconds
          ? new Date(b.createdAt.seconds * 1000)
          : new Date(b.createdAt)
        : new Date(0)
      return dateB - dateA // Más recientes primero
    })

    console.log("Pedidos encontrados:", orders.length)
    return { success: true, orders }
  } catch (error) {
    console.error("Error al obtener pedidos del usuario:", error)
    return { success: false, error: error.message }
  }
}

export async function getAllOrders() {
  try {
    // Consulta simple sin ordenamiento
    const querySnapshot = await getDocs(collection(db, "orders"))
    const orders = []
    querySnapshot.forEach((doc) => {
      const orderData = doc.data()
      orders.push({
        firebaseId: doc.id,
        id: orderData.id || doc.id,
        ...orderData,
      })
    })

    // Ordenar en JavaScript
    orders.sort((a, b) => {
      const dateA = a.createdAt
        ? a.createdAt.seconds
          ? new Date(a.createdAt.seconds * 1000)
          : new Date(a.createdAt)
        : new Date(0)
      const dateB = b.createdAt
        ? b.createdAt.seconds
          ? new Date(b.createdAt.seconds * 1000)
          : new Date(b.createdAt)
        : new Date(0)
      return dateB - dateA
    })

    return { success: true, orders }
  } catch (error) {
    console.error("Error al obtener todos los pedidos:", error)
    return { success: false, error: error.message }
  }
}

export async function updateOrderStatus(orderId, newStatus) {
  try {
    const orderRef = doc(db, "orders", orderId)
    await updateDoc(orderRef, {
      status: newStatus,
      updatedAt: new Date(),
    })
    console.log("Estado del pedido actualizado:", orderId, newStatus)
    return { success: true }
  } catch (error) {
    console.error("Error al actualizar estado del pedido:", error)
    return { success: false, error: error.message }
  }
}

// ==========================================
// FUNCIONES DE MIGRACIÓN (OPCIONAL)
// ==========================================

export async function migrateLocalStorageToFirebase() {
  try {
    console.log("Iniciando migración de localStorage a Firebase...")

    // Migrar usuarios
    const localUsers = JSON.parse(localStorage.getItem("restaurantUsers") || "[]")
    for (const user of localUsers) {
      const existingUser = await getUserByEmail(user.email)
      if (!existingUser.success) {
        await saveUser(user)
        console.log("Usuario migrado:", user.email)
      }
    }

    // Migrar productos
    const localProducts = JSON.parse(localStorage.getItem("adminProducts") || "[]")
    for (const product of localProducts) {
      await saveProduct(product)
      console.log("Producto migrado:", product.name)
    }

    // Migrar pedidos
    const localOrders = JSON.parse(localStorage.getItem("orders") || "{}")
    if (Array.isArray(localOrders)) {
      for (const order of localOrders) {
        await saveOrder(order)
        console.log("Pedido migrado:", order.id)
      }
    } else {
      for (const email in localOrders) {
        for (const order of localOrders[email]) {
          await saveOrder(order)
          console.log("Pedido migrado:", order.id)
        }
      }
    }

    console.log("Migración completada")
    return { success: true }
  } catch (error) {
    console.error("Error en la migración:", error)
    return { success: false, error: error.message }
  }
}

// Función para inicializar productos por defecto si no existen
export async function ensureDefaultProducts() {
  try {
    console.log("Verificando productos en Firebase...")
    const existingProducts = await getAllProducts()

    if (existingProducts.success && existingProducts.products.length === 0) {
      console.log("No hay productos, inicializando productos por defecto...")

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

      for (const product of defaultProducts) {
        const result = await saveProduct(product)
        if (result.success) {
          console.log("Producto por defecto agregado:", product.name)
        }
      }

      console.log("Productos por defecto inicializados correctamente")
      return { success: true, message: "Productos por defecto inicializados" }
    } else {
      console.log("Ya existen productos en Firebase:", existingProducts.products.length)
      return { success: true, message: "Productos ya existen" }
    }
  } catch (error) {
    console.error("Error al inicializar productos por defecto:", error)
    return { success: false, error: error.message }
  }
}

// Función para inicializar productos por defecto
export async function initializeDefaultProducts() {
  try {
    const existingProducts = await getAllProducts()
    if (existingProducts.success && existingProducts.products.length === 0) {
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

      for (const product of defaultProducts) {
        await saveProduct(product)
      }
      console.log("Productos por defecto inicializados")
    }
  } catch (error) {
    console.error("Error al inicializar productos por defecto:", error)
  }
}
