import { auth, googleProvider, createUserWithEmailAndPassword, signInWithPopup, getOrCreateUserProfile } from "./firebase.js"

const $ = (id) => document.getElementById(id)
const notify = (message, type = "info") => { const el = $("notification"); if (el) { el.textContent = message; el.className = `notification ${type} show`; setTimeout(() => el.classList.remove("show"), 4000) } }
const setBusy = (busy) => { const button = $("registerButton"); if (button) { button.disabled = busy; $("registerText").textContent = busy ? "Registrando..." : "Registrarse" } }

$("registerForm")?.addEventListener("submit", async (event) => {
  event.preventDefault()
  const profile = { name: $("name").value.trim(), surname: $("surname").value.trim(), phone: $("phone").value.trim() }
  const email = $("email").value.trim(); const password = $("password").value
  if (!profile.name || !profile.surname || !profile.phone || !email || !password) return notify("Completa todos los campos obligatorios.", "error")
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return notify("Ingresa un correo válido.", "error")
  if (password.length < 6) return notify("La contraseña debe tener al menos 6 caracteres.", "error")
  setBusy(true)
  try { const credential = await createUserWithEmailAndPassword(auth, email, password); await getOrCreateUserProfile(credential.user, profile); notify("¡Cuenta creada correctamente!", "success"); setTimeout(() => { location.href = "menu.html" }, 700) }
  catch (error) { console.error("Error en registro:", error); notify(error.code === "auth/email-already-in-use" ? "Este correo ya está registrado." : "No fue posible crear la cuenta.", "error"); setBusy(false) }
})

$("googleRegister")?.addEventListener("click", async () => { try { const credential = await signInWithPopup(auth, googleProvider); const result = await getOrCreateUserProfile(credential.user); localStorage.setItem("currentUser", JSON.stringify({ id: result.user.id || credential.user.uid, uid: credential.user.uid, name: result.user.name || credential.user.displayName || "Usuario", surname: result.user.surname || "", email: credential.user.email, phone: result.user.phone || "", role: result.user.role || "cliente", isAdmin: false })); localStorage.setItem("currentUserEmail", credential.user.email || ""); location.href = "menu.html" } catch (error) { console.error("Error con Google:", error); notify("No fue posible registrarte con Google.", "error") } })

$("email")?.setAttribute("autocomplete", "email"); $("password")?.setAttribute("autocomplete", "new-password")
