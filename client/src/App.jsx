import {
  useEffect,
  useState
} from 'react';

import {
  Routes,
  Route,
  Link,
  Navigate,
  useLocation
} from 'react-router-dom';

import toast, {
  Toaster
} from 'react-hot-toast';

import Cart from './components/Cart';
import Checkout from './components/Checkout';
import AdminPanel from './components/AdminPanel';
import Login from './components/Login';
import Register from './components/Register';
import MyOrders from './components/MyOrders';
import ProtectedRoute from './components/ProtectedRoute';
import AdminRoute from './components/AdminRoute';

const getRemainingStock = (
  product,
  cart
) => {
  const cartItem = cart.find(
    (item) =>
      Number(item.id) ===
      Number(product.id)
  );

  const quantityInCart = cartItem
    ? Number(cartItem.quantity)
    : 0;

  return Math.max(
    0,
    Number(product.stock) -
      quantityInCart
  );
};

const ProductGrid = ({
  products,
  onAddToCart,
  cart
}) => (
  <div
    style={{
      display: 'grid',
      gridTemplateColumns:
        'repeat(auto-fill, minmax(280px, 1fr))',
      gap: '24px'
    }}
  >
    {products.map((item, index) => {
      const remainingStock =
        getRemainingStock(
          item,
          cart
        );

      return (
        <div
          key={item.id || index}
          className="product-card"
        >
          <div className="image-container">
            <img
              src={item.image_url}
              alt={item.name}
              className="product-image"
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'contain'
              }}
              onError={(event) => {
                event.target.src =
                  'https://via.placeholder.com/200?text=No+Image';
              }}
            />
          </div>

          <div className="product-info">
            <h3
              className="product-title"
              style={{
                margin: '0 0 10px',
                textAlign: 'center'
              }}
            >
              {item.name}
            </h3>

            <p
              style={{
                color:
                  'var(--text-muted)',
                fontSize: '0.95rem',
                textAlign: 'center'
              }}
            >
              {item.description}
            </p>

            <p
              style={{
                fontWeight: '600',
                fontSize: '1.25rem',
                textAlign: 'center',
                color:
                  'var(--text-main)'
              }}
            >
              ₪{item.price}
            </p>

            <p
              style={{
                textAlign: 'center',
                minHeight: '20px',
                margin: '0 0 15px',
                fontSize: '0.9rem',

                fontWeight:
                  remainingStock <= 5
                    ? 'bold'
                    : 'normal',

                color:
                  remainingStock <= 0
                    ? '#e74c3c'
                    : remainingStock <= 5
                      ? '#e67e22'
                      : 'var(--text-muted)'
              }}
            >
              {remainingStock <= 0
                ? 'No more units available'
                : remainingStock === 1
                  ? 'Only 1 unit left'
                  : remainingStock <= 5
                    ? `Only ${remainingStock} units left`
                    : `${remainingStock} units available`}
            </p>

            <button
              type="button"
              className="btn-primary add-to-cart-btn"
              style={{
                width: '100%',

                opacity:
                  Number(item.stock) <= 0
                    ? 0.5
                    : 1,

                cursor:
                  Number(item.stock) <= 0
                    ? 'not-allowed'
                    : 'pointer'
              }}
              onClick={() =>
                onAddToCart(item)
              }
              disabled={
                Number(item.stock) <= 0
              }
            >
              {Number(item.stock) <= 0
                ? 'Out of Stock'
                : 'Add to Cart'}
            </button>
          </div>
        </div>
      );
    })}
  </div>
);

function App() {
  const location = useLocation();

  const [items, setItems] =
    useState([]);

  const [cart, setCart] =
    useState(() => {
      const savedCart =
        localStorage.getItem(
          'baking_corner_cart'
        );

      if (!savedCart) {
        return [];
      }

      try {
        return JSON.parse(savedCart);
      } catch (error) {
        console.error(
          'Invalid saved cart:',
          error
        );

        return [];
      }
    });

  const [
    currentUser,
    setCurrentUser
  ] = useState(() => {
    const savedUser =
      localStorage.getItem(
        'baking_corner_user'
      );

    if (!savedUser) {
      return null;
    }

    try {
      return JSON.parse(savedUser);
    } catch (error) {
      console.error(
        'Invalid saved user:',
        error
      );

      localStorage.removeItem(
        'baking_corner_user'
      );

      localStorage.removeItem(
        'baking_corner_token'
      );

      return null;
    }
  });

  const loadProducts = async () => {
    try {
      const response = await fetch(
        'http://localhost:5000/api/products'
      );

      if (!response.ok) {
        throw new Error(
          'Failed to load products'
        );
      }

      const data =
        await response.json();

      setItems(data);
    } catch (error) {
      console.error(
        'Error fetching products:',
        error
      );

      toast.error(
        'Failed to load products',
        {
          id:
            'load-products-error'
        }
      );
    }
  };

  useEffect(() => {
    localStorage.setItem(
      'baking_corner_cart',
      JSON.stringify(cart)
    );
  }, [cart]);

  useEffect(() => {
    const productPages = [
      '/',
      '/ingredients',
      '/equipment'
    ];

    if (
      productPages.includes(
        location.pathname
      )
    ) {
      loadProducts();
    }
  }, [location.pathname]);

  const addToCart = async (
    product
  ) => {
    try {
      const response = await fetch(
        'http://localhost:5000/api/products'
      );

      if (!response.ok) {
        throw new Error(
          'Failed to check inventory'
        );
      }

      const latestProducts =
        await response.json();

      const latestProduct =
        latestProducts.find(
          (item) =>
            Number(item.id) ===
            Number(product.id)
        );

      if (!latestProduct) {
        toast.error(
          'Product was not found',
          {
            id:
              `product-not-found-${product.id}`
          }
        );

        return;
      }

      const availableStock =
        Number(latestProduct.stock);

      if (availableStock <= 0) {
        toast.error(
          `"${latestProduct.name}" is out of stock`,
          {
            id:
              `out-of-stock-${latestProduct.id}`
          }
        );

        setItems(latestProducts);
        return;
      }

      setItems(latestProducts);

      setCart((previousCart) => {
        const existingItem =
          previousCart.find(
            (item) =>
              Number(item.id) ===
              Number(latestProduct.id)
          );

        const currentQuantity =
          existingItem
            ? Number(
                existingItem.quantity
              )
            : 0;

        if (
          currentQuantity >=
          availableStock
        ) {
          const unitText =
            availableStock === 1
              ? 'unit'
              : 'units';

          const verb =
            availableStock === 1
              ? 'is'
              : 'are';

          toast.error(
            `Only ${availableStock} ${unitText} of "${latestProduct.name}" ${verb} available`,
            {
              id:
                `stock-limit-${latestProduct.id}`
            }
          );

          return previousCart;
        }

        toast.success(
          `"${latestProduct.name}" added to cart`,
          {
            id:
              `add-product-${latestProduct.id}`
          }
        );

        if (existingItem) {
          return previousCart.map(
            (item) =>
              Number(item.id) ===
              Number(
                latestProduct.id
              )
                ? {
                    ...item,
                    stock:
                      availableStock,
                    quantity:
                      currentQuantity +
                      1
                  }
                : item
          );
        }

        return [
          ...previousCart,
          {
            ...latestProduct,
            stock: availableStock,
            quantity: 1
          }
        ];
      });
    } catch (error) {
      console.error(
        'Inventory check failed:',
        error
      );

      toast.error(
        'Could not check the current inventory',
        {
          id:
            'inventory-check-error'
        }
      );
    }
  };

  const decreaseQuantity = (
    product
  ) => {
    setCart((previousCart) => {
      const existingItem =
        previousCart.find(
          (item) =>
            Number(item.id) ===
            Number(product.id)
        );

      if (!existingItem) {
        return previousCart;
      }

      if (
        Number(
          existingItem.quantity
        ) === 1
      ) {
        return previousCart.filter(
          (item) =>
            Number(item.id) !==
            Number(product.id)
        );
      }

      return previousCart.map(
        (item) =>
          Number(item.id) ===
          Number(product.id)
            ? {
                ...item,
                quantity:
                  Number(
                    item.quantity
                  ) - 1
              }
            : item
      );
    });
  };

  const removeFromCart = (
    productId
  ) => {
    setCart((previousCart) =>
      previousCart.filter(
        (item) =>
          Number(item.id) !==
          Number(productId)
      )
    );
  };

  const clearCart = () => {
    setCart([]);

    localStorage.removeItem(
      'baking_corner_cart'
    );

    loadProducts();
  };

  const handleLogin = (user) => {
    setCurrentUser(user);
  };

  const handleLogout = () => {
    localStorage.removeItem(
      'baking_corner_token'
    );

    localStorage.removeItem(
      'baking_corner_user'
    );

    setCurrentUser(null);

    toast.success(
      'Logged out successfully',
      {
        id: 'logout-success'
      }
    );
  };

  const totalItemsInCart =
    cart.reduce(
      (sum, item) =>
        sum +
        Number(item.quantity),
      0
    );

  return (
    <div
      style={{
        padding: '40px 20px',
        maxWidth: '1200px',
        margin: '0 auto',
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column'
      }}
    >
      <Toaster />

      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          position: 'relative',
          marginBottom: '10px'
        }}
      >
        <h1 style={{ margin: 0 }}>
          Welcome to The Baking Corner
        </h1>

        <Link
          to="/cart"
          style={{
            position: 'absolute',
            right: 0,
            fontSize: '1.8rem',
            cursor: 'pointer',
            textDecoration: 'none',
            color: 'inherit'
          }}
        >
          🛒

          {totalItemsInCart > 0 && (
            <span
              style={{
                position: 'absolute',
                top: '-8px',
                right: '-12px',
                backgroundColor:
                  '#e74c3c',
                color: '#ffffff',
                borderRadius: '50%',
                padding: '2px 7px',
                fontSize: '1rem',
                fontWeight: 'bold',
                minWidth: '22px',
                textAlign: 'center',
                boxShadow:
                  '0 2px 5px rgba(0,0,0,0.2)'
              }}
            >
              {totalItemsInCart}
            </span>
          )}
        </Link>
      </div>

      <p
        style={{
          textAlign: 'center',
          marginBottom: '20px'
        }}
      >
        Our high-quality baking products:
      </p>

      <nav
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '30px',
          marginBottom: '40px'
        }}
      >
        <Link
          to="/"
          style={navigationLinkStyle}
        >
          All Products
        </Link>

        <Link
          to="/ingredients"
          style={navigationLinkStyle}
        >
          Ingredients
        </Link>

        <Link
          to="/equipment"
          style={navigationLinkStyle}
        >
          Equipment
        </Link>

        {currentUser?.role ===
          'admin' && (
          <Link
            to="/admin"
            style={{
              ...navigationLinkStyle,
              color: '#e74c3c'
            }}
          >
            Admin Panel
          </Link>
        )}

        {currentUser ? (
          <>
            <Link
              to="/my-orders"
              style={
                navigationLinkStyle
              }
            >
              My Orders
            </Link>

            <span
              style={{
                color:
                  'var(--text-muted)',
                fontSize: '0.95rem'
              }}
            >
              Hello,{' '}
              {currentUser.firstName}
            </span>

            <button
              type="button"
              onClick={handleLogout}
              style={{
                border: 'none',
                background: 'none',
                color: '#e74c3c',
                cursor: 'pointer',
                fontWeight: 'bold',
                fontSize: '1rem'
              }}
            >
              Logout
            </button>
          </>
        ) : (
          <>
            <Link
              to="/login"
              style={
                navigationLinkStyle
              }
            >
              Login
            </Link>

            <Link
              to="/register"
              style={
                navigationLinkStyle
              }
            >
              Register
            </Link>
          </>
        )}
      </nav>

      <Routes>
        <Route
          path="/"
          element={
            <ProductGrid
              products={items}
              onAddToCart={
                addToCart
              }
              cart={cart}
            />
          }
        />

        <Route
          path="/ingredients"
          element={
            <ProductGrid
              products={items.filter(
                (item) =>
                  item.category ===
                  'ingredients'
              )}
              onAddToCart={
                addToCart
              }
              cart={cart}
            />
          }
        />

        <Route
          path="/equipment"
          element={
            <ProductGrid
              products={items.filter(
                (item) =>
                  item.category ===
                  'equipment'
              )}
              onAddToCart={
                addToCart
              }
              cart={cart}
            />
          }
        />

        <Route
          path="/login"
          element={
            currentUser ? (
              <Navigate
                to="/"
                replace
              />
            ) : (
              <Login
                onLogin={
                  handleLogin
                }
              />
            )
          }
        />

        <Route
          path="/register"
          element={
            currentUser ? (
              <Navigate
                to="/"
                replace
              />
            ) : (
              <Register />
            )
          }
        />

        <Route
          path="/my-orders"
          element={
            <ProtectedRoute
              currentUser={
                currentUser
              }
            >
              <MyOrders
                onProductsChanged={
                  loadProducts
                }
              />
            </ProtectedRoute>
          }
        />

        <Route
          path="/admin"
          element={
            <AdminRoute
              currentUser={
                currentUser
              }
            >
              <AdminPanel
                onProductsChanged={
                  loadProducts
                }
              />
            </AdminRoute>
          }
        />

        <Route
          path="/cart"
          element={
            <Cart
              cart={cart}
              onIncrease={addToCart}
              onDecrease={
                decreaseQuantity
              }
              onRemove={
                removeFromCart
              }
            />
          }
        />

        <Route
          path="/checkout"
          element={
            <ProtectedRoute
              currentUser={
                currentUser
              }
            >
              <Checkout
                cart={cart}
                currentUser={
                  currentUser
                }
                onOrderComplete={
                  clearCart
                }
              />
            </ProtectedRoute>
          }
        />

        <Route
          path="*"
          element={
            <Navigate
              to="/"
              replace
            />
          }
        />
      </Routes>
    </div>
  );
}

const navigationLinkStyle = {
  textDecoration: 'none',
  color: 'var(--text-main)',
  fontWeight: 'bold',
  fontSize: '1.1rem'
};

export default App;