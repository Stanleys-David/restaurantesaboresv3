import { auth, getUserProfile, onAuthStateChanged, updateUserProfile } from "./firebase.js"

const $ = (id) => document.getElementById(id)
const DEFAULT_PHOTO = "https://via.placeholder.com/150?text=Perfil"
let currentFirebaseUser = null
let currentProfile = null
let selectedPhoto = ""

function roleLabel(role, isAdmin) {
  if (role === "admin" || isAdmin) return "Administrador"
  if (role === "mesero") return "Mesero"
  return "Cliente"
}

function notify(message, type) {
  const notification = $("notification")
  notification.textContent = message
  notification.className = `notification ${type}`
  window.clearTimeout(notify.timeout)
  notify.timeout = window.setTimeout(() => { notification.className = "notification" }, 4000)
}

function fillForm(profile, firebaseUser) {
  currentProfile = profile
  $("name").value = profile.name || firebaseUser.displayName?.split(" ")[0] || ""
  $("surname").value = profile.surname || firebaseUser.displayName?.split(" ").slice(1).join(" ") || ""
  $("email").value = profile.email || firebaseUser.email || ""
  $("phone").value = profile.phone || ""
  $("address").value = profile.address || ""
  $("addressReference").value = profile.addressReference || ""
  $("userRole").textContent = roleLabel(profile.role, profile.isAdmin)
  selectedPhoto = profile.photoURL || firebaseUser.photoURL || ""
  $("profilePhoto").src = selectedPhoto || DEFAULT_PHOTO
}

function compressPhoto(file) {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith("image/")) return reject(new Error("Selecciona una imagen válida."))
    if (file.size > 5 * 1024 * 1024) return reject(new Error("La imagen no puede superar 5 MB."))

    const reader = new FileReader()
    reader.onerror = () => reject(new Error("No fue posible leer la imagen."))
    reader.onload = () => {
      const image = new Image()
      image.onerror = () => reject(new Error("No fue posible procesar la imagen."))
      image.onload = () => {
        const maxSize = 512
        const scale = Math.min(1, maxSize / Math.max(image.width, image.height))
        const canvas = document.createElement("canvas")
        canvas.width = Math.round(image.width * scale)
        canvas.height = Math.round(image.height * scale)
        canvas.getContext("2d").drawImage(image, 0, 0, canvas.width, canvas.height)
        resolve(canvas.toDataURL("image/jpeg", 0.82))
      }
      image.src = reader.result
    }
    reader.readAsDataURL(file)
  })
}

$("photoInput")?.addEventListener("change", async (event) => {
  const file = event.target.files[0]
  if (!file) return
  try {
    selectedPhoto = await compressPhoto(file)
    $("profilePhoto").src = selectedPhoto
    notify("La nueva foto se guardará al actualizar tu perfil.", "success")
  } catch (error) {
    notify(error.message, "error")
    event.target.value = ""
  }
})

$("profileForm")?.addEventListener("submit", async (event) => {
  event.preventDefault()
  if (!currentFirebaseUser || !currentProfile) return

  const saveButton = $("saveBtn")
  const profileData = {
    name: $("name").value.trim(),
    surname: $("surname").value.trim(),
    phone: $("phone").value.trim(),
    address: $("address").value.trim(),
    addressReference: $("addressReference").value.trim(),
    photoURL: selectedPhoto || "",
  }

  if (!profileData.name) return notify("El nombre es obligatorio.", "error")

  saveButton.disabled = true
  saveButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Guardando...'
  const result = await updateUserProfile(currentFirebaseUser.uid, profileData)
  saveButton.disabled = false
  saveButton.innerHTML = '<i class="fas fa-save"></i> Guardar cambios'

  if (!result.success) return notify("No fue posible guardar los cambios. Intenta nuevamente.", "error")

  currentProfile = result.user
  const session = JSON.parse(localStorage.getItem("currentUser") || "{}")
  localStorage.setItem("currentUser", JSON.stringify({
    ...session,
    id: result.user.id,
    uid: currentFirebaseUser.uid,
    email: result.user.email || currentFirebaseUser.email,
    name: result.user.name,
    surname: result.user.surname,
    phone: result.user.phone,
    address: result.user.address || "",
    addressReference: result.user.addressReference || "",
    photoURL: result.user.photoURL || "",
    role: result.user.role || "cliente",
    isAdmin: Boolean(result.user.isAdmin || result.user.role === "admin"),
  }))
  notify("Perfil actualizado correctamente.", "success")
})

onAuthStateChanged(auth, async (firebaseUser) => {
  if (!firebaseUser) {
    window.location.href = "inicioSesion.html"
    return
  }

  currentFirebaseUser = firebaseUser
  const result = await getUserProfile(firebaseUser.uid)
  if (!result.success) {
    notify("No fue posible cargar tu perfil.", "error")
    return
  }
  fillForm(result.user, firebaseUser)
})