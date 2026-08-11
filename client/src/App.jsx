import { useEffect, useState } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import toast, { Toaster } from 'react-hot-toast';

// === Components ===
import Navbar from './components/Navbar';
import ProductGrid from './components/ProductGrid';

// === Pages ===
import Cart from './pages/Cart';
import Checkout from './pages/Checkout';
import AdminPanel from './pages/AdminPanel';
import Login from './pages/Login';
import Register from './pages/Register';
import MyOrders from './pages/MyOrders';

function App() {
  const location = useLocation();
  const [items, setItems] = useState([]);

  const [cart, setCart] = useState(() => {
    const savedCart = localStorage.getItem('baking_corner_cart');
    return savedCart ? JSON.parse(savedCart) : [];
  });

  const [currentUser, setCurrentUser] = useState(() => {
    const savedUser = localStorage.getItem('baking_corner_user');
    return savedUser ? JSON.parse(savedUser) : null;
  });

  useEffect(() => {
    localStorage.setItem('baking_corner_cart', JSON.stringify(cart));
  }, [cart]);

  useEffect(() => {
    const productPages = ['/', '/ingredients', '/equipment'];
    if (productPages.includes(location.pathname)) {
      loadProducts();
    }
  }, [location.pathname]);

  const loadProducts = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/products');
      if (!response.ok) throw new Error('Failed to load products');
      const data = await response.json();
      setItems(data);
    } catch (error) {
      console.error('Error fetching products:', error);
      toast.error('Failed to load products', { id: 'load-products-error' });
    }
  };

  useEffect(() => {
    loadProducts();
  }, []);

  const addToCart = async (product) => {
    try {
      const response = await fetch('http://localhost:5000/api/products');
      if (!response.ok) throw new Error('Failed to check inventory');
      const latestProducts = await response.json();
      const latestProduct = latestProducts.find(item => Number(item.id) === Number(product.id));

      if (!latestProduct) {
        toast.error('Product was not found', { id: `product-not-found-${product.id}` });
        return;
      }

      const availableStock = Number(latestProduct.stock);
      if (availableStock <= 0) {
        toast.error(`"${latestProduct.name}" is out of stock`, { id: `out-of-stock-${latestProduct.id}` });
        setItems(latestProducts);
        return;
      }

      setItems(latestProducts);

      setCart((previousCart) => {
        const existingItem = previousCart.find(item => Number(item.id) === Number(latestProduct.id));
        const currentQuantity = existingItem ? Number(existingItem.quantity) : 0;

        if (currentQuantity >= availableStock) {
          const unitText = availableStock === 1 ? 'unit' : 'units';
          const verb = availableStock === 1 ? 'is' : 'are';
          toast.error(`Only ${availableStock} ${unitText} of "${latestProduct.name}" ${verb} available`, {
            id: `stock-limit-${latestProduct.id}`
          });
          return previousCart;
        }

        toast.success(`"${latestProduct.name}" added to cart`, { id: `add-product-${latestProduct.id}` });

        if (existingItem) {
          return previousCart.map(item =>
            Number(item.id) === Number(latestProduct.id)
              ? { ...item, stock: availableStock, quantity: currentQuantity + 1 }
              : item
          );
        }

        return [...previousCart, { ...latestProduct, stock: availableStock, quantity: 1 }];
      });
    } catch (error) {
      console.error('Inventory check failed:', error);
      toast.error('Could not check the current inventory', { id: 'inventory-check-error' });
    }
  };

  const decreaseQuantity = (product) => {
    setCart((previousCart) => {
      const existingItem = previousCart.find(item => Number(item.id) === Number(product.id));
      if (!existingItem) return previousCart;

      if (Number(existingItem.quantity) === 1) {
        return previousCart.filter(item => Number(item.id) !== Number(product.id));
      }

      return previousCart.map(item =>
        Number(item.id) === Number(product.id)
          ? { ...item, quantity: Number(item.quantity) - 1 }
          : item
      );
    });
  };

  const removeFromCart = (productId) => {
    setCart((previousCart) => previousCart.filter(item => Number(item.id) !== Number(productId)));
  };

  const clearCart = () => {
    setCart([]);
    localStorage.removeItem('baking_corner_cart');
    loadProducts();
  };

  const handleLogin = (user) => {
    setCurrentUser(user);
  };

  const handleLogout = () => {
    localStorage.removeItem('baking_corner_token');
    localStorage.removeItem('baking_corner_user');
    setCurrentUser(null);
    toast.success('Logged out successfully', { id: 'logout-success' });
  };

  const totalItemsInCart = cart.reduce((sum, item) => sum + Number(item.quantity), 0);

  // תראי איזה קצר ונקי ה-return עכשיו!
  return (
    <div style={{ padding: '40px 20px', maxWidth: '1200px', margin: '0 auto', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Toaster />

      {/* הרכיב החדש של תפריט הניווט מקבל את הנתונים ומצייר אותם לבד */}
      <Navbar 
        currentUser={currentUser} 
        totalItemsInCart={totalItemsInCart} 
        onLogout={handleLogout} 
      />

      <Routes>
        <Route path="/" element={<ProductGrid products={items} onAddToCart={addToCart} cart={cart} />} />
        
        <Route path="/ingredients" element={<ProductGrid products={items.filter(item => item.category === 'ingredients')} onAddToCart={addToCart} cart={cart} />} />
        
        <Route path="/equipment" element={<ProductGrid products={items.filter(item => item.category === 'equipment')} onAddToCart={addToCart} cart={cart} />} />

        <Route path="/login" element={currentUser ? <Navigate to="/" /> : <Login onLogin={handleLogin} />} />
        
        <Route path="/register" element={currentUser ? <Navigate to="/" /> : <Register />} />
        
        <Route path="/my-orders" element={currentUser ? <MyOrders onProductsChanged={loadProducts} /> : <Navigate to="/login" />} />
        
        <Route path="/admin" element={currentUser?.role === 'admin' ? <AdminPanel onProductsChanged={loadProducts} /> : <Navigate to="/login" />} />
        
        <Route path="/cart" element={<Cart cart={cart} onIncrease={addToCart} onDecrease={decreaseQuantity} onRemove={removeFromCart} />} />
        
        <Route path="/checkout" element={currentUser ? <Checkout cart={cart} currentUser={currentUser} onOrderComplete={clearCart} /> : <Navigate to="/login" />} />
      </Routes>
    </div>
  );
}

export default App;