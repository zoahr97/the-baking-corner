import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';

export default function AdminPanel() {
    const [activeTab, setActiveTab] = useState('orders'); // 'orders', 'users', 'products'
    const [orders, setOrders] = useState([]);
    const [users, setUsers] = useState([]);
    const [products, setProducts] = useState([]);
    const [form, setForm] = useState({ name: '', description: '', price: '', category: 'ingredients', image_url: '', stock: '' });
    const [editingProductId, setEditingProductId] = useState(null);

    // Fetch all data on load
    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const [ordersRes, usersRes, productsRes] = await Promise.all([
                fetch('http://localhost:5000/api/orders'),
                fetch('http://localhost:5000/api/users'),
                fetch('http://localhost:5000/api/products')
            ]);

            if (ordersRes.ok) setOrders(await ordersRes.json());
            if (usersRes.ok) setUsers(await usersRes.json());
            if (productsRes.ok) setProducts(await productsRes.json());
        } catch (err) {
            console.error('Error fetching admin data', err);
            toast.error('Failed to load admin dashboard data');
        }
    };

    const handleAddProduct = async (e) => {
        e.preventDefault();
        try {
            const res = await fetch('http://localhost:5000/api/products', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(form)
            });
            if (res.ok) {
                toast.success('Product added successfully!');
                setForm({ name: '', description: '', price: '', category: 'ingredients', image_url: '', stock: '' });
                fetchData(); // Refresh product list
            } else {
                toast.error('Failed to add product');
            }
        } catch (err) {
            toast.error('Error connecting to server');
        }
    };

    const handleDeleteProduct = async (productId) => {
        if (!window.confirm('Are you sure you want to delete this product?')) return;

        try {
            const response = await fetch(`http://localhost:5000/api/products/${productId}`, {
                method: 'DELETE',
            });

            if (response.ok) {
                // Update local state to remove the product from the UI
                setProducts(products.filter(product => product.id !== productId));
                alert('Product deleted successfully!');
            } else {
                alert('Failed to delete product.');
            }
        } catch (error) {
            console.error('Error deleting product:', error);
        }
    };

    const handleUpdateProduct = async (productId, updatedData) => {
        try {
            const response = await fetch(`http://localhost:5000/api/products/${productId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(updatedData),
            });

            if (response.ok) {
                // Update the product list in the state
                setProducts(products.map(product =>
                    product.id === productId ? { ...product, ...updatedData } : product
                ));

                // Clear the form back to default empty values
                setForm({ name: '', price: '', stock: '', category: 'ingredients', image_url: '', description: '' });

                alert('Product updated successfully!');
            } else {
                alert('Failed to update product.');
            }
        } catch (error) {
            console.error('Error updating product:', error);
        }
    };

    const handleEditClick = (product) => {
        setEditingProductId(product.id);

        // Fill the form with the current product details
        setForm({
            name: product.name,
            price: product.price,
            stock: product.stock,
            category: product.category,
            image_url: product.image_url || '',
            description: product.description || ''
        });

        // Optional: Scroll smoothly to the top where the form is
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    return (
        <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '20px' }}>
            <h2>Admin Control Panel 🛡️</h2>

            {/* Navigation Tabs */}
            <div style={{ display: 'flex', gap: '15px', margin: '20px 0', borderBottom: '2px solid #eee', paddingBottom: '10px' }}>
                <button onClick={() => setActiveTab('orders')} style={tabStyle(activeTab === 'orders')}>📦 Orders</button>
                <button onClick={() => setActiveTab('users')} style={tabStyle(activeTab === 'users')}>👥 Users</button>
                <button onClick={() => setActiveTab('products')} style={tabStyle(activeTab === 'products')}>🧁 Products & Inventory</button>
            </div>

            {/* TAB 1: ORDERS */}
            {activeTab === 'orders' && (
                <div>
                    <h3>Customer Orders ({orders.length})</h3>
                    {orders.length === 0 ? <p>No orders found.</p> : (
                        <table style={tableStyle}>
                            <thead>
                                <tr style={{ background: '#f4f4f4' }}>
                                    <th style={thStyle}>Order ID</th>
                                    <th style={thStyle}>User ID</th>
                                    <th style={thStyle}>Total Price</th>
                                    <th style={thStyle}>Status</th>
                                    <th style={thStyle}>Date</th>
                                </tr>
                            </thead>
                            <tbody>
                                {orders.map(order => (
                                    <tr key={order.id} style={{ borderBottom: '1px solid #ddd' }}>
                                        <td style={tdStyle}>{order.id}</td>
                                        <td style={tdStyle}>{order.user_id}</td>
                                        <td style={tdStyle}>₪{order.total_price || order.total_amount}</td>
                                        <td style={tdStyle}><span style={badgeStyle(order.status)}>{order.status || 'pending'}</span></td>
                                        <td style={tdStyle}>{new Date(order.created_at || order.order_date).toLocaleString()}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            )}

            {/* TAB 2: USERS */}
            {activeTab === 'users' && (
                <div>
                    <h3>Registered Users ({users.length})</h3>
                    {users.length === 0 ? <p>No users found (or endpoint not created yet).</p> : (
                        <table style={tableStyle}>
                            <thead>
                                <tr style={{ background: '#f4f4f4' }}>
                                    <th style={thStyle}>ID</th>
                                    <th style={thStyle}>Name</th>
                                    <th style={thStyle}>Email</th>
                                    <th style={thStyle}>Role</th>
                                </tr>
                            </thead>
                            <tbody>
                                {users.map(u => (
                                    <tr key={u.id} style={{ borderBottom: '1px solid #ddd' }}>
                                        <td style={tdStyle}>{u.id}</td>
                                        <td style={tdStyle}>{u.first_name} {u.last_name}</td>
                                        <td style={tdStyle}>{u.email}</td>
                                        <td style={tdStyle}><strong style={{ color: u.role === 'admin' ? '#e74c3c' : '#27ae60' }}>{u.role}</strong></td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            )}

            {/* TAB 3: PRODUCTS & INVENTORY */}
            {activeTab === 'products' && (
                <div>
                    <h3>Products Inventory ({products.length})</h3>

                    {/* Add / Edit Product Form */}
                    <form
                        onSubmit={(e) => {
                            e.preventDefault();
                            if (editingProductId) {
                                // If we have an ID, we update
                                handleUpdateProduct(editingProductId, form);
                                setEditingProductId(null); // Exit edit mode
                            } else {
                                // If no ID, we add new
                                handleAddProduct(e);
                            }
                        }}
                        style={{ background: '#f9f9f9', padding: '15px', borderRadius: '8px', marginBottom: '25px', border: '1px solid #ddd', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}
                    >
                        <h4 style={{ gridColumn: 'span 2', margin: '0 0 10px 0' }}>
                            {editingProductId ? 'Edit Product' : 'Add New Product'}
                        </h4>

                        {/* ... כל ה-inputs שלך נשארים אותו דבר בדיוק ... */}
                        <input type="text" placeholder="Product Name" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required style={inputStyle} />
                        <input type="number" placeholder="Price (₪)" value={form.price} onChange={e => setForm({ ...form, price: e.target.value })} required style={inputStyle} />
                        <input type="number" placeholder="Stock Quantity" value={form.stock} onChange={e => setForm({ ...form, stock: e.target.value })} required style={inputStyle} />
                        <select value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} style={inputStyle}>
                            <option value="ingredients">Ingredients</option>
                            <option value="equipment">Equipment</option>
                        </select>
                        <input type="text" placeholder="Image URL" value={form.image_url} onChange={e => setForm({ ...form, image_url: e.target.value })} style={{ ...inputStyle, gridColumn: 'span 2' }} />
                        <input type="text" placeholder="Description" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} style={{ ...inputStyle, gridColumn: 'span 2' }} />

                        {/* Buttons area */}
                        <div style={{ gridColumn: 'span 2', display: 'flex', gap: '10px' }}>
                            <button type="submit" className="btn-primary" style={{ flex: 1, padding: '10px', cursor: 'pointer', background: editingProductId ? '#f39c12' : '' }}>
                                {editingProductId ? 'Update Product' : 'Add Product to DB'}
                            </button>

                            {/* Cancel Edit Button - shows only in edit mode */}
                            {editingProductId && (
                                <button
                                    type="button"
                                    onClick={() => {
                                        setEditingProductId(null);
                                        setForm({ name: '', price: '', stock: '', category: 'ingredients', image_url: '', description: '' }); // Clear form
                                    }}
                                    style={{ flex: 1, padding: '10px', cursor: 'pointer', background: '#95a5a6', color: 'white', border: 'none', borderRadius: '4px' }}
                                >
                                    Cancel Edit
                                </button>
                            )}
                        </div>
                    </form>

                    {/* Products Table */}
                    <table style={tableStyle}>
                        
                        <thead>
                            <tr style={{ background: '#f4f4f4' }}>
                                <th style={thStyle}>ID</th>
                                <th style={thStyle}>Name</th>
                                <th style={thStyle}>Category</th>
                                <th style={thStyle}>Price</th>
                                <th style={thStyle}>Stock</th>
                            </tr>
                        </thead>
                        <tbody>
                            {products.map(p => (
                                <tr key={p.id} style={{ borderBottom: '1px solid #ddd' }}>
                                    <td style={tdStyle}>{p.id}</td>
                                    <td style={tdStyle}>{p.name}</td>
                                    <td style={tdStyle}>{p.category}</td>
                                    <td style={tdStyle}>₪{p.price}</td>
                                    <td style={tdStyle}>
                                        <span style={{ color: p.stock < 5 ? '#e74c3c' : '#27ae60', fontWeight: 'bold' }}>
                                            {p.stock !== undefined ? p.stock : 'N/A'}
                                        </span>
                                    </td>

                                    <td style={tdStyle}>
                                        {/* כפתור העריכה החדש שממלא את הטופס למעלה */}
                                        <button
                                            onClick={() => handleEditClick(p)}
                                            style={{ cursor: 'pointer', padding: '5px 10px', background: '#f39c12', color: 'white', border: 'none', borderRadius: '4px', marginRight: '8px' }}
                                        >
                                            Edit
                                        </button>

                                        {/* כפתור המחיקה הקיים */}
                                        <button
                                            onClick={() => handleDeleteProduct(p.id)}
                                            style={{ cursor: 'pointer', padding: '5px 10px', background: '#e74c3c', color: 'white', border: 'none', borderRadius: '4px' }}
                                        >
                                            Delete
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}

// Styles helpers
const tabStyle = (isActive) => ({
    padding: '10px 20px',
    cursor: 'pointer',
    background: isActive ? '#3498db' : '#f0f0f0',
    color: isActive ? '#fff' : '#333',
    border: 'none',
    borderRadius: '4px',
    fontWeight: 'bold',
    fontSize: '1rem'
});

const tableStyle = { width: '100%', borderCollapse: 'collapse', background: '#fff', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' };
const thStyle = { padding: '12px', textAlign: 'left', borderBottom: '2px solid #ddd' };
const tdStyle = { padding: '12px', textAlign: 'left' };
const inputStyle = { padding: '8px', borderRadius: '4px', border: '1px solid #ccc' };
const badgeStyle = (status) => ({
    padding: '4px 8px',
    borderRadius: '12px',
    fontSize: '0.85rem',
    background: status === 'shipped' ? '#e2f0d9' : '#fff2cc',
    color: status === 'shipped' ? '#385723' : '#806000'
});