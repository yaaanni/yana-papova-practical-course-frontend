import Login from './page/Login'
import Register from './page/Register'
import Navbar from './component/Navbar'
import Profile from './page/Profile'
import AddCard from './page/AddCard'
import Cart from './page/Cart'
import Users from './page/Users'
import Orders from './page/Orders'
import './App.css'
import { Route, Routes } from 'react-router-dom'
import Catalog from './page/Catalog'

function App() {
  return (
    <Routes>
      <Route path="/addCard" element={<AddCard />} />
      <Route path="/" element={<Login />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/profile" element={<Profile />} />
      <Route path="/catalog" element={<Catalog />} />
      <Route path="/cart" element={<Cart />} />
      <Route path="/navbar" element={<Navbar />} />
      <Route path="/users" element={<Users />} />
      <Route path="/orders" element={<Orders />} />
    </Routes>
  )
}

export default App
