import { auth, googleProvider, signInWithEmailAndPassword, signInWithPopup, sendPasswordResetEmail, getOrCreateUserProfile } from "./firebase.js"

const $ = (id) => document.getElementById(id)
const notify = (message, type = "info") => { const el = $("notification"); if (el) { el.textContent = message; el.className = `notification ${type} show`; setTimeout(() => el.classList.remove("show"), 4000) } }
const setBusy = (busy) => { const button = $("loginButton"); if (button) { button.disabled = busy; $("loginText").textContent = busy ? "Iniciando sesión..." : "Iniciar Sesión" } }

function sessionFrom(user, profile) {
  const session = { id: profile.id || user.uid, uid: user.uid, name: profile.name || user.displayName || "Usuario", surname: profile.surname || "", email: user.email, phone: profile.phone || "", role: profile.role || "cliente", isAdmin: profile.role === "admin" }
  localStorage.setItem("currentUser", JSON.stringify(session)); localStorage.setItem("currentUserEmail", user.email || ""); return session
}
function redirectByRole(session) { window.location.href = session.role === "admin" ? "admin.html" : "menu.html" }

window.addEventListener("load", () => {
  if (new URLSearchParams(location.search).get("registered") === "true") notify("¡Registro exitoso! Ya puedes iniciar sesión.", "success")
})

$("loginForm")?.addEventListener("submit", async (event) => {
  event.preventDefault(); const email = $("email").value.trim(); const password = $("password").value
  if (!email || !password) return notify("Ingresa tu correo y contraseña.", "error")
  setBusy(true)
  try { const credential = await signInWithEmailAndPassword(auth, email, password); const result = await getOrCreateUserProfile(credential.user); const session = sessionFrom(credential.user, result.user || {}); notify("¡Bienvenido!", "success"); setTimeout(() => redirectByRole(session), 700) }
  catch (error) { console.error("Error en login:", error); notify(error.code === "auth/invalid-credential" ? "Correo o contraseña incorrectos." : "No fue posible iniciar sesión. Intenta nuevamente.", "error"); setBusy(false) }
})

$("googleLogin")?.addEventListener("click", async () => { try { const credential = await signInWithPopup(auth, googleProvider); const result = await getOrCreateUserProfile(credential.user); const session = sessionFrom(credential.user, result.user || {}); redirectByRole(session) } catch (error) { console.error("Error con Google:", error); notify("No fue posible iniciar sesión con Google.", "error") } })
$("forgotPassword")?.addEventListener("click", async () => { const email = $("email").value.trim(); if (!email) return notify("Escribe tu correo para recuperar la contraseña.", "error"); try { await sendPasswordResetEmail(auth, email); notify("Te enviamos un enlace para restablecer tu contraseña.", "success") } catch (error) { console.error("Error recuperando contraseña:", error); notify("No fue posible enviar el correo de recuperación.", "error") } })

$("loginForm")?.addEventListener("keydown", (event) => { if (event.key === "Enter" && (event.nativeEvent?.isComposing || event.keyCode === 229)) event.preventDefault() })

auth.onAuthStateChanged?.(() => {})

window.addEventListener("beforeunload", () => {})

// Firebase Auth conserva la sesión de forma segura; localStorage solo contiene datos de presentación no sensibles.
void window

// Exportado únicamente para depuración manual en consola.
export {}

// Evita un error si el navegador no soporta optional chaining sobre métodos antiguos.
if (!auth) notify("La autenticación no está disponible.", "error")

// El formulario se inicializa automáticamente al cargar el módulo.

// Compatibilidad con páginas antiguas que disparan Enter globalmente.
document.addEventListener("keypress", (event) => { if (event.key === "Enter" && !event.target.closest("form") && !(event.nativeEvent?.isComposing || event.keyCode === 229)) $("loginForm")?.requestSubmit() })

// Mantener una referencia explícita para herramientas de accesibilidad.
$("email")?.setAttribute("autocomplete", "email")
$("password")?.setAttribute("autocomplete", "current-password")

// No se almacenan contraseñas.
