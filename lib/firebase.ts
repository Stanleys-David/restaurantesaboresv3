import { initializeApp, getApps } from 'firebase/app'
import { getFirestore, collection, getDocs, addDoc, query, where } from 'firebase/firestore'

const firebaseConfig = {
  apiKey: 'AIzaSyBYSC5Ut97m3Ah5dLr4AM4Ed5r13_KS7Fg',
  authDomain: 'restaurantesabores-a8d5e.firebaseapp.com',
  projectId: 'restaurantesabores-a8d5e',
  storageBucket: 'restaurantesabores-a8d5e.firebasestorage.app',
  messagingSenderId: '847705836289',
  appId: '1:847705836289:web:8962067b4501f8d437a900',
}

const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig)
export const db = getFirestore(app)
export type Product = { id: string; name: string; price: number; description: string; image: string; category: string; featured?: boolean; available?: boolean }
export async function getProducts() { const snap = await getDocs(collection(db, 'products')); return snap.docs.map((item) => ({ id: item.id, ...item.data() })) as Product[] }
export async function createOrder(order: Record<string, unknown>) { return addDoc(collection(db, 'orders'), { ...order, createdAt: new Date() }) }
export async function getOrders(email: string) { const snap = await getDocs(query(collection(db, 'orders'), where('customerEmail', '==', email))); return snap.docs.map((item) => ({ id: item.id, ...item.data() })) }
