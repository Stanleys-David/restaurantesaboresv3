import { auth, getUserProfile, onAuthStateChanged, updateUserProfile } from "./firebase.js"

const $ = (id) => document.getElementById(id)
const DEFAULT_PHOTO = "https://via.placeholder.com/150?text=Perfil"
let currentFirebaseUser = null
let currentProfile = null
let selectedPhoto = ""

function roleLabel(role, isAdmin) { return role === "admin" || isAdmin ? "Administrador" : role === "mesero" ? "Mesero" : "Cliente" }
function notify(message, type) { const element = $("notification"); element.textContent = message; element.className = `notification ${type}`; clearTimeout(notify.timeout); notify.timeout = setTimeout(() => { element.className = "notification" }, 4000) }
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
  $("modalProfilePhoto").src = selectedPhoto || DEFAULT_PHOTO
  $("summaryName").textContent = `${$("name").value} ${$("surname").value}`.trim() || "—"
  $("summaryEmail").textContent = $("email").value || "—"
  $("summaryPhone").textContent = $("phone").value || "Sin teléfono"
  $("summaryAddress").textContent = $("address").value || "Sin dirección"
}
function compressPhoto(file) { return new Promise((resolve, reject) => { if (!file.type.startsWith("image/")) return reject(new Error("Selecciona una imagen válida.")); if (file.size > 5 * 1024 * 1024) return reject(new Error("La imagen no puede superar 5 MB.")); const reader = new FileReader(); reader.onerror = () => reject(new Error("No fue posible leer la imagen.")); reader.onload = () => { const image = new Image(); image.onerror = () => reject(new Error("No fue posible procesar la imagen.")); image.onload = () => { const scale = Math.min(1, 512 / Math.max(image.width, image.height)); const canvas = document.createElement("canvas"); canvas.width = Math.round(image.width * scale); canvas.height = Math.round(image.height * scale); canvas.getContext("2d").drawImage(image, 0, 0, canvas.width, canvas.height); resolve(canvas.toDataURL("image/jpeg", .82)) }; image.src = reader.result }; reader.readAsDataURL(file) }) }
$("openProfileModal")?.addEventListener("click", () => $("profileModal").classList.add("show"))
$("closeProfileModal")?.addEventListener("click", () => $("profileModal").classList.remove("show"))
$("profileModal")?.addEventListener("click", (event) => { if (event.target === $("profileModal")) $("profileModal").classList.remove("show") })
$("photoInput")?.addEventListener("change", async (event) => { const file = event.target.files[0]; if (!file) return; try { selectedPhoto = await compressPhoto(file); $("profilePhoto").src = selectedPhoto; $("modalProfilePhoto").src = selectedPhoto } catch (error) { notify(error.message, "error"); event.target.value = "" } })
$("profileForm")?.addEventListener("submit", async (event) => { event.preventDefault(); if (!currentFirebaseUser) return; const button = $("saveBtn"); const data = { name: $("name").value.trim(), surname: $("surname").value.trim(), phone: $("phone").value.trim(), address: $("address").value.trim(), addressReference: $("addressReference").value.trim(), photoURL: selectedPhoto }; if (!data.name) return notify("El nombre es obligatorio.", "error"); button.disabled = true; const result = await updateUserProfile(currentFirebaseUser.uid, data); button.disabled = false; if (!result.success) return notify("No fue posible guardar los cambios.", "error"); localStorage.setItem("currentUser", JSON.stringify({ ...JSON.parse(localStorage.getItem("currentUser") || "{}"), ...result.user, uid: currentFirebaseUser.uid, isAdmin: Boolean(result.user.isAdmin || result.user.role === "admin") })); fillForm(result.user, currentFirebaseUser); $("profileModal").classList.remove("show"); notify("Perfil actualizado correctamente.", "success") })
onAuthStateChanged(auth, async (firebaseUser) => { if (!firebaseUser) return window.location.href = "inicioSesion.html"; currentFirebaseUser = firebaseUser; const result = await getUserProfile(firebaseUser.uid); if (!result.success) return notify("No fue posible cargar tu perfil.", "error"); fillForm(result.user, firebaseUser) })