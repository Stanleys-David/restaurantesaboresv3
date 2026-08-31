// Configuración de Firebase
import { initializeApp, deleteApp } from "https://www.gstatic.com/firebasejs/11.9.0/firebase-app.js"
import { getAuth, GoogleAuthProvider, signInWithEmailAndPassword, createUserWithEmailAndPassword, signInWithPopup, sendPasswordResetEmail, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.9.0/firebase-auth.js"
import {
  getFirestore,
  collection,
  addDoc,
  getDocs,
  getDoc,
  setDoc,
  doc,
  updateDoc,
  deleteDoc,
  query,
  where,
  onSnapshot,
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
const auth = getAuth(app)
const googleProvider = new GoogleAuthProvider()

export { auth, googleProvider, signInWithEmailAndPassword, createUserWithEmailAndPassword, signInWithPopup, sendPasswordResetEmail, signOut, onAuthStateChanged }

export async function getUserProfile(uid) {
  try {
    const userDoc = await getDocs(query(collection(db, "users"), where("uid", "==", uid)))
    if (!userDoc.empty) {
      const profile = { id: userDoc.docs[0].id, ...userDoc.docs[0].data() }
      return { success: true, user: { ...profile, role: profile.role || (profile.isAdmin ? "admin" : "cliente") } }
    }
    return { success: false, error: "Perfil no encontrado" }
  } catch (error) {
    return { success: false, error: error.message }
  }
}

export async function saveUserProfile(user, profile = {}) {
  const existing = await getUserProfile(user.uid)
  if (existing.success) return existing
  const userData = {
    uid: user.uid,
    email: user.email || "",
    name: profile.name || user.displayName?.split(" ")[0] || "Usuario",
    surname: profile.surname || user.displayName?.split(" ").slice(1).join(" ") || "",
    phone: profile.phone || "",
    role: profile.role || "cliente",
    isAdmin: Boolean(profile.isAdmin || profile.role === "admin"),
    photoURL: profile.photoURL || user.photoURL || "",
    address: profile.address || "",
    addressReference: profile.addressReference || "",
    provider: user.providerData[0]?.providerId || "password",
    createdAt: new Date(),
  }
  const docRef = await addDoc(collection(db, "users"), userData)
  return { success: true, user: { id: docRef.id, ...userData } }
}

export async function getOrCreateUserProfile(user, profile = {}) {
  const existing = await getUserProfile(user.uid)
  if (!existing.success) return saveUserProfile(user, profile)

  const current = existing.user
  const updated = {
    uid: user.uid,
    email: user.email || current.email || "",
    name: current.name || profile.name || user.displayName?.split(" ")[0] || "Usuario",
    surname: current.surname || profile.surname || user.displayName?.split(" ").slice(1).join(" ") || "",
    phone: current.phone || profile.phone || "",
    role: current.role || (current.isAdmin ? "admin" : "cliente"),
    isAdmin: Boolean(current.isAdmin || current.role === "admin"),
    photoURL: current.photoURL || profile.photoURL || user.photoURL || "",
    address: current.address || profile.address || "",
    addressReference: current.addressReference || profile.addressReference || "",
    provider: user.providerData[0]?.providerId || current.provider || "password",
    updatedAt: new Date(),
  }
  await updateDoc(doc(db, "users", current.id), updated)
  return { success: true, user: { id: current.id, ...current, ...updated } }
}
export async function updateUserProfile(uid, profileData) {
  try {
    const existing = await getUserProfile(uid)
    if (!existing.success) return { success: false, error: "Perfil no encontrado" }

    const { id, uid: profileUid, email, role, isAdmin, createdAt, ...currentProfile } = existing.user
    const updatedProfile = {
      ...currentProfile,
      ...profileData,
      uid: profileUid,
      email,
      role,
      isAdmin: Boolean(isAdmin || role === "admin"),
      updatedAt: new Date(),
    }

    await updateDoc(doc(db, "users", id), updatedProfile)
    return { success: true, user: { id, ...updatedProfile } }
  } catch (error) {
    console.error("Error al actualizar perfil:", error)
    return { success: false, error: error.message }
  }
}

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

export async function createUserFromAdmin(account, profile) {
  let secondaryApp = null
  try {
    secondaryApp = initializeApp(firebaseConfig, `admin-user-${Date.now()}-${Math.random().toString(36).slice(2)}`)
    const secondaryAuth = getAuth(secondaryApp)
    const credential = await createUserWithEmailAndPassword(secondaryAuth, account.email, account.password)
    const docRef = await addDoc(collection(db, "users"), {
      uid: credential.user.uid,
      email: credential.user.email,
      name: profile.name,
      surname: profile.surname || "",
      phone: profile.phone || "",
      address: profile.address || "",
      addressReference: profile.addressReference || "",
      photoURL: profile.photoURL || "",
      role: profile.role || "cliente",
      isAdmin: Boolean(profile.isAdmin || profile.role === "admin"),
      provider: "password",
      createdAt: new Date(),
    })
    return { success: true, user: { id: docRef.id, uid: credential.user.uid } }
  } catch (error) {
    console.error("Error al crear usuario desde administración:", error)
    return { success: false, error: error.message, code: error.code }
  } finally {
    if (secondaryApp) await deleteApp(secondaryApp)
  }
}

export async function updateUserFromAdmin(userId, userData) {
  try {
    const { id, uid, email, createdAt, ...editableData } = userData
    await updateDoc(doc(db, "users", userId), {
      ...editableData,
      isAdmin: Boolean(editableData.isAdmin || editableData.role === "admin"),
      updatedAt: new Date(),
    })
    return { success: true }
  } catch (error) {
    console.error("Error al actualizar usuario:", error)
    return { success: false, error: error.message }
  }
}

export async function deleteUserProfile(userId) {
  try {
    await deleteDoc(doc(db, "users", userId))
    return { success: true }
  } catch (error) {
    console.error("Error al eliminar usuario:", error)
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


export async function saveCashClosing(data) {
  try { const ref = await addDoc(collection(db, "cashClosings"), { ...data, createdAt: new Date() }); return { success: true, id: ref.id } }
  catch (error) { console.error("Error al guardar cuadre:", error); return { success: false, error: error.message } }
}
export async function getPublicIntegrationSettings() {
  try {
    const snapshot = await getDoc(doc(db, "settings", "credentials"))
    if (!snapshot.exists()) return { success: true, settings: {} }
    const data = snapshot.data()
    return { success: true, settings: { wompiPublicKey: data.wompiPublicKey || "", whatsappPhoneNumberId: data.whatsappPhoneNumberId || "", whatsappTemplateName: data.whatsappTemplateName || "" } }
  } catch (error) { return { success: false, error: error.message } }
}

export async function savePublicIntegrationSettings(settings) {
  try {
    await setDoc(doc(db, "settings", "credentials"), { wompiPublicKey: settings.wompiPublicKey || "", whatsappPhoneNumberId: settings.whatsappPhoneNumberId || "", whatsappTemplateName: settings.whatsappTemplateName || "", updatedAt: new Date() }, { merge: true })
    return { success: true }
  } catch (error) { console.error("Error al guardar integraciones:", error); return { success: false, error: error.message } }
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
// FUNCIONES PARA ÁREAS Y MESAS
// ==========================================

export async function getAllAreas() {
  const snapshot = await getDocs(collection(db, "areas"))
  return { success: true, areas: snapshot.docs.map((item) => ({ id: item.id, ...item.data() })) }
}

export async function saveArea(areaData) {
  const ref = await addDoc(collection(db, "areas"), { ...areaData, createdAt: new Date() })
  return { success: true, id: ref.id }
}

export async function deleteArea(areaId) {
  await deleteDoc(doc(db, "areas", areaId))
  return { success: true }
}

export async function getAllTables() {
  const snapshot = await getDocs(collection(db, "tables"))
  return { success: true, tables: snapshot.docs.map((item) => ({ id: item.id, ...item.data() })) }
}

export async function saveTable(tableData, tableId = null) {
  if (tableId) {
    await updateDoc(doc(db, "tables", tableId), { ...tableData, updatedAt: new Date() })
    return { success: true, id: tableId }
  }
  const ref = await addDoc(collection(db, "tables"), { ...tableData, status: "available", createdAt: new Date() })
  return { success: true, id: ref.id }
}

export async function deleteTable(tableId) {
  await deleteDoc(doc(db, "tables", tableId))
  return { success: true }
}

export async function updateTableStatus(tableId, status, orderId = null) {
  await updateDoc(doc(db, "tables", tableId), { status, activeOrderId: orderId, updatedAt: new Date() })
  return { success: true }
}

export async function releaseTableForOrder(orderId) {
  const snapshot = await getDocs(query(collection(db, "tables"), where("activeOrderId", "==", orderId)))
  await Promise.all(snapshot.docs.map((table) => updateDoc(table.ref, { status: "available", activeOrderId: null, updatedAt: new Date() })))
  return { success: true, released: snapshot.size }
}

export function subscribeToTables(callback) {
  return onSnapshot(collection(db, "tables"), (snapshot) => callback(snapshot.docs.map((item) => ({ id: item.id, ...item.data() }))))
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
