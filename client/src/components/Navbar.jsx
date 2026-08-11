import { Link } from 'react-router-dom';

export default function Navbar({ currentUser, totalItemsInCart, onLogout }) {
  const navigationLinkStyle = {
    textDecoration: 'none',
    color: 'var(--text-main)',
    fontWeight: 'bold',
    fontSize: '1.1rem'
  };

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', position: 'relative', marginBottom: '10px' }}>
        <h1 style={{ margin: 0 }}>Welcome to The Baking Corner</h1>
        
        <Link to="/cart" style={{ position: 'absolute', right: 0, fontSize: '1.8rem', cursor: 'pointer', textDecoration: 'none', color: 'inherit' }}>
          🛒
          {totalItemsInCart > 0 && (
            <span style={{
              position: 'absolute', top: '-8px', right: '-12px', backgroundColor: '#e74c3c',
              color: '#fff', borderRadius: '50%', padding: '2px 7px', fontSize: '1rem',
              fontWeight: 'bold', minWidth: '22px', textAlign: 'center', boxShadow: '0 2px 5px rgba(0,0,0,0.2)'
            }}>
              {totalItemsInCart}
            </span>
          )}
        </Link>
      </div>

      <p style={{ textAlign: 'center', marginBottom: '20px' }}>Our high-quality baking products:</p>

      <nav style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'center', gap: '30px', marginBottom: '40px' }}>
        <Link to="/" style={navigationLinkStyle}>All Products</Link>
        <Link to="/ingredients" style={navigationLinkStyle}>Ingredients</Link>
        <Link to="/equipment" style={navigationLinkStyle}>Equipment</Link>

        {currentUser?.role === 'admin' && (
          <Link to="/admin" style={{ ...navigationLinkStyle, color: '#e74c3c' }}>Admin Panel</Link>
        )}

        {currentUser ? (
          <>
            <Link to="/my-orders" style={navigationLinkStyle}>My Orders</Link>
            <span style={{ color: 'var(--text-muted)', fontSize: '0.95rem' }}>
              Hello, {currentUser.firstName}
            </span>
            <button type="button" onClick={onLogout} style={{ border: 'none', background: 'none', color: '#e74c3c', cursor: 'pointer', fontWeight: 'bold', fontSize: '1rem' }}>
              Logout
            </button>
          </>
        ) : (
          <>
            <Link to="/login" style={navigationLinkStyle}>Login</Link>
            <Link to="/register" style={navigationLinkStyle}>Register</Link>
          </>
        )}
      </nav>
    </>
  );
}