import { auth, googleProvider, createUserWithEmailAndPassword, signInWithPopup, getOrCreateUserProfile } from "./firebase.js"

const $ = (id) => document.getElementById(id)
const notify = (message, type = "info") => { const el = $("notification"); if (el) { el.textContent = message; el.className = `notification ${type} show`; setTimeout(() => el.classList.remove("show"), 4000) } }
const setBusy = (busy) => { const button = $("registerButton"); if (button) { button.disabled = busy; $("registerText").textContent = busy ? "Registrando..." : "Registrarse" } }
const saveSession = (firebaseUser, profile) => { localStorage.setItem("currentUser", JSON.stringify({ id: profile.id || firebaseUser.uid, uid: firebaseUser.uid, name: profile.name || firebaseUser.displayName || "Usuario", surname: profile.surname || "", email: firebaseUser.email || "", phone: profile.phone || "", address: profile.address || "", addressReference: profile.addressReference || "", photoURL: profile.photoURL || firebaseUser.photoURL || "", role: profile.role || "cliente", isAdmin: Boolean(profile.isAdmin || profile.role === "admin") })); localStorage.setItem("currentUserEmail", firebaseUser.email || "") }

$("registerForm")?.addEventListener("submit", async (event) => {
  event.preventDefault()
  const profile = { name: $("name").value.trim(), surname: $("surname").value.trim(), phone: $("phone").value.trim() }
  const email = $("email").value.trim(); const password = $("password").value
  if (!profile.name || !profile.surname || !profile.phone || !email || !password) return notify("Completa todos los campos obligatorios.", "error")
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return notify("Ingresa un correo válido.", "error")
  if (password.length < 6) return notify("La contraseña debe tener al menos 6 caracteres.", "error")
  setBusy(true)
  try { const credential = await createUserWithEmailAndPassword(auth, email, password); const result = await getOrCreateUserProfile(credential.user, profile); saveSession(credential.user, result.user || profile); notify("¡Cuenta creada correctamente!", "success"); setTimeout(() => { location.href = "menu.html" }, 700) }
  catch (error) { console.error("Error en registro:", error); notify(error.code === "auth/email-already-in-use" ? "Este correo ya está registrado." : "No fue posible crear la cuenta.", "error"); setBusy(false) }
})

$("googleRegister")?.addEventListener("click", async () => { try { const credential = await signInWithPopup(auth, googleProvider); const result = await getOrCreateUserProfile(credential.user); saveSession(credential.user, result.user || {}); location.href = (result.user?.role === "admin" ? "admin.html" : result.user?.role === "mesero" ? "mesero.html" : "menu.html") } catch (error) { console.error("Error con Google:", error); notify("No fue posible registrarte con Google.", "error") } })

$("email")?.setAttribute("autocomplete", "email"); $("password")?.setAttribute("autocomplete", "new-password")
