import {
  useEffect,
  useState
} from 'react';
import toast from 'react-hot-toast';

const emptyProductForm = {
  name: '',
  description: '',
  price: '',
  category: 'ingredients',
  image_url: '',
  stock: ''
};

const getToken = () =>
  localStorage.getItem(
    'baking_corner_token'
  );

const getAuthHeaders = (
  includeContentType = false
) => {
  const headers = {
    Authorization: `Bearer ${getToken()}`
  };

  if (includeContentType) {
    headers['Content-Type'] =
      'application/json';
  }

  return headers;
};

export default function AdminPanel({
  onProductsChanged
}) {
  const [activeTab, setActiveTab] =
    useState('orders');

  const [orders, setOrders] = useState([]);
  const [users, setUsers] = useState([]);
  const [products, setProducts] =
    useState([]);

  const [form, setForm] =
    useState(emptyProductForm);

  const [
    editingProductId,
    setEditingProductId
  ] = useState(null);

  const [
    selectedOrder,
    setSelectedOrder
  ] = useState(null);

  const [orderItems, setOrderItems] =
    useState([]);
const [
  selectedImage,
  setSelectedImage
] = useState(null);

const [
  isUploadingImage,
  setIsUploadingImage
] = useState(false);

  const fetchData = async () => {
    try {
      const [
        ordersResponse,
        usersResponse,
        productsResponse
      ] = await Promise.all([
        fetch(
          'http://localhost:5000/api/orders',
          {
            headers: getAuthHeaders()
          }
        ),

        fetch(
          'http://localhost:5000/api/users',
          {
            headers: getAuthHeaders()
          }
        ),

        fetch(
          'http://localhost:5000/api/products'
        )
      ]);

      if (
        ordersResponse.status === 401 ||
        usersResponse.status === 401
      ) {
        throw new Error(
          'Your session expired. Please log in again.'
        );
      }

      if (
        ordersResponse.status === 403 ||
        usersResponse.status === 403
      ) {
        throw new Error(
          'Administrator access is required'
        );
      }

      if (!ordersResponse.ok) {
        throw new Error(
          'Failed to load orders'
        );
      }

      if (!usersResponse.ok) {
        throw new Error(
          'Failed to load users'
        );
      }

      if (!productsResponse.ok) {
        throw new Error(
          'Failed to load products'
        );
      }

      const [
        ordersData,
        usersData,
        productsData
      ] = await Promise.all([
        ordersResponse.json(),
        usersResponse.json(),
        productsResponse.json()
      ]);

      setOrders(ordersData);
      setUsers(usersData);
      setProducts(productsData);
    } catch (error) {
      console.error(
        'Error fetching admin data:',
        error
      );

      toast.error(error.message, {
        id: 'admin-data-error'
      });
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleAddProduct = async (
    event
  ) => {
    event.preventDefault();

    try {
      const response = await fetch(
        'http://localhost:5000/api/products',
        {
          method: 'POST',
          headers: getAuthHeaders(true),
          body: JSON.stringify(form)
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error ||
          'Failed to add product'
        );
      }

      toast.success(
        'Product added successfully!',
        {
          id: 'product-added'
        }
      );

      setForm(emptyProductForm);
      await fetchData();
      await onProductsChanged?.();
    } catch (error) {
      console.error(
        'Error adding product:',
        error
      );

      toast.error(error.message, {
        id: 'add-product-error'
      });
    }
  };

  const handleDeleteProduct = async (
    productId
  ) => {
    const confirmed = window.confirm(
      'Are you sure you want to delete this product?'
    );

    if (!confirmed) {
      return;
    }

    try {
      const response = await fetch(
        `http://localhost:5000/api/products/${productId}`,
        {
          method: 'DELETE',
          headers: getAuthHeaders()
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error ||
          'Failed to delete product'
        );
      }

      setProducts((previousProducts) =>
        previousProducts.filter(
          (product) =>
            Number(product.id) !==
            Number(productId)
        )
      );
      await onProductsChanged?.();
      toast.success(
        'Product deleted successfully!',
        {
          id: `product-deleted-${productId}`
        }
      );
    } catch (error) {
      console.error(
        'Error deleting product:',
        error
      );

      toast.error(error.message, {
        id: `delete-product-error-${productId}`
      });
    }
  };

  const handleUpdateProduct = async (
    productId,
    updatedData
  ) => {
    try {
      const response = await fetch(
        `http://localhost:5000/api/products/${productId}`,
        {
          method: 'PUT',
          headers: getAuthHeaders(true),
          body: JSON.stringify(updatedData)
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error ||
          'Failed to update product'
        );
      }

      setProducts((previousProducts) =>
        previousProducts.map((product) =>
          Number(product.id) ===
          Number(productId)
            ? {
                ...product,
                ...updatedData
              }
            : product
        )
      );

      setForm(emptyProductForm);
      setEditingProductId(null);
      await onProductsChanged?.(); 
      toast.success(
        'Product updated successfully!',
        {
          id: `product-updated-${productId}`
        }
      );
    } catch (error) {
      console.error(
        'Error updating product:',
        error
      );

      toast.error(error.message, {
        id: `update-product-error-${productId}`
      });
    }
  };

  const handleEditClick = (product) => {
    setEditingProductId(product.id);

    setForm({
      name: product.name,
      price: product.price,
      stock: product.stock,
      category: product.category,
      image_url: product.image_url || '',
      description:
        product.description || ''
    });

    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  };

  const handleViewOrder = async (
    order
  ) => {
    try {
      const response = await fetch(
        `http://localhost:5000/api/orders/${order.id}/items`,
        {
          headers: getAuthHeaders()
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error ||
          'Failed to fetch order items'
        );
      }

      setSelectedOrder(order);
      setOrderItems(data);

      setTimeout(() => {
        window.scrollTo({
          top: document.body.scrollHeight,
          behavior: 'smooth'
        });
      }, 100);
    } catch (error) {
      console.error(
        'Error loading order details:',
        error
      );

      toast.error(error.message, {
        id: `order-details-error-${order.id}`
      });
    }
  };

  const handleStatusChange = async (
    orderId,
    newStatus
  ) => {
    try {
      const response = await fetch(
        `http://localhost:5000/api/orders/${orderId}/status`,
        {
          method: 'PUT',
          headers: getAuthHeaders(true),
          body: JSON.stringify({
            status: newStatus
          })
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error ||
          'Failed to update status'
        );
      }

      setOrders((previousOrders) =>
        previousOrders.map((order) =>
          Number(order.id) ===
          Number(orderId)
            ? {
                ...order,
                status: newStatus
              }
            : order
        )
      );

      setSelectedOrder(
        (previousOrder) =>
          Number(previousOrder?.id) ===
          Number(orderId)
            ? {
                ...previousOrder,
                status: newStatus
              }
            : previousOrder
      );

      const productsResponse =
        await fetch(
          'http://localhost:5000/api/products'
        );

      if (productsResponse.ok) {
        const updatedProducts =
          await productsResponse.json();

        setProducts(updatedProducts);
      }
      await onProductsChanged?.();
      toast.success(
        'Order status updated',
        {
          id: `status-updated-${orderId}`
        }
      );
    } catch (error) {
      console.error(
        'Error updating order status:',
        error
      );

      toast.error(error.message, {
        id: `status-error-${orderId}`
      });
    }
  };
  
const handleImageUpload = async () => {
  if (!selectedImage) {
    toast.error('Please select an image');
    return;
  }

  const token = localStorage.getItem(
    'baking_corner_token'
  );

  const uploadData = new FormData();

  uploadData.append(
    'image',
    selectedImage
  );

  setIsUploadingImage(true);

  try {
    const response = await fetch(
      'http://localhost:5000/api/uploads/product-image',
      {
        method: 'POST',
        headers: {
          Authorization:
            `Bearer ${token}`
        },
        body: uploadData
      }
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(
        data.error ||
        'Failed to upload image'
      );
    }

    setForm((previousForm) => ({
      ...previousForm,
      image_url: data.imageUrl
    }));

    setSelectedImage(null);

    toast.success(
      'Image uploaded successfully'
    );
  } catch (error) {
    console.error(
      'Image upload error:',
      error
    );

    toast.error(error.message);
  } finally {
    setIsUploadingImage(false);
  }
};
  return (
    <div
      style={{
        maxWidth: '1000px',
        margin: '0 auto',
        padding: '20px'
      }}
    >
      <h2>Admin Control Panel 🛡️</h2>

      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '15px',
          margin: '20px 0',
          borderBottom: '2px solid #eee',
          paddingBottom: '10px'
        }}
      >
        <button
          onClick={() =>
            setActiveTab('orders')
          }
          style={tabStyle(
            activeTab === 'orders'
          )}
        >
          📦 Orders
        </button>

        <button
          onClick={() =>
            setActiveTab('users')
          }
          style={tabStyle(
            activeTab === 'users'
          )}
        >
          👥 Users
        </button>

        <button
          onClick={() =>
            setActiveTab('products')
          }
          style={tabStyle(
            activeTab === 'products'
          )}
        >
          🧁 Products & Inventory
        </button>
      </div>

      {activeTab === 'orders' && (
        <div>
          <h3>
            Customer Orders ({orders.length})
          </h3>

          {orders.length === 0 ? (
            <p>No orders found.</p>
          ) : (
            <div style={tableWrapperStyle}>
              <table style={tableStyle}>
                <thead>
                  <tr
                    style={{
                      background: '#f4f4f4'
                    }}
                  >
                    <th style={thStyle}>
                      Order ID
                    </th>

                    <th style={thStyle}>
                      Customer
                    </th>

                    <th style={thStyle}>
                      Total
                    </th>

                    <th style={thStyle}>
                      Status
                    </th>

                    <th style={thStyle}>
                      Date
                    </th>

                    <th style={thStyle}>
                      Actions
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {orders.map((order) => (
                    <tr
                      key={order.id}
                      style={{
                        borderBottom:
                          '1px solid #ddd'
                      }}
                    >
                      <td style={tdStyle}>
                        {order.id}
                      </td>

                      <td style={tdStyle}>
                        {order.customer_name ||
                          `User ${order.user_id}`}
                      </td>

                      <td style={tdStyle}>
                        ₪
                        {Number(
                          order.total_amount
                        ).toFixed(2)}
                      </td>

                      <td style={tdStyle}>
                        <select
                          value={
                            order.status ||
                            'pending'
                          }
                          onChange={(event) =>
                            handleStatusChange(
                              order.id,
                              event.target.value
                            )
                          }
                          style={selectStyle}
                        >
                          <option value="pending">
                            Pending
                          </option>

                          <option value="processing">
                            Processing
                          </option>

                          <option value="shipped">
                            Shipped
                          </option>

                          <option value="delivered">
                            Delivered
                          </option>

                          <option value="cancelled">
                            Cancelled
                          </option>
                        </select>
                      </td>

                      <td style={tdStyle}>
                        {new Date(
                          order.order_date
                        ).toLocaleString()}
                      </td>

                      <td style={tdStyle}>
                        <button
                          onClick={() =>
                            handleViewOrder(
                              order
                            )
                          }
                          style={viewButtonStyle}
                        >
                          View Details
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {selectedOrder && (
            <div
              style={{
                marginTop: '30px',
                padding: '25px',
                backgroundColor: '#fff',
                border: '1px solid #ddd',
                boxShadow:
                  '0 4px 12px rgba(0,0,0,0.08)'
              }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent:
                    'space-between',
                  alignItems: 'center'
                }}
              >
                <h3>
                  Order #{selectedOrder.id}{' '}
                  Details
                </h3>

                <button
                  onClick={() => {
                    setSelectedOrder(null);
                    setOrderItems([]);
                  }}
                  style={{
                    border: 'none',
                    background: 'none',
                    fontSize: '1.4rem',
                    cursor: 'pointer'
                  }}
                >
                  ✕
                </button>
              </div>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns:
                    'repeat(auto-fit, minmax(250px, 1fr))',
                  gap: '10px 30px',
                  marginBottom: '25px'
                }}
              >
                <p>
                  <strong>Customer:</strong>{' '}
                  {selectedOrder.customer_name ||
                    'Not available'}
                </p>

                <p>
                  <strong>Email:</strong>{' '}
                  {selectedOrder.customer_email ||
                    'Not available'}
                </p>

                <p>
                  <strong>Phone:</strong>{' '}
                  {selectedOrder.customer_phone ||
                    'Not available'}
                </p>

                <p>
                  <strong>City:</strong>{' '}
                  {selectedOrder.shipping_city ||
                    'Not available'}
                </p>

                <p>
                  <strong>Address:</strong>{' '}
                  {selectedOrder.shipping_address ||
                    'Not available'}
                </p>

                <p>
                  <strong>Payment:</strong>{' '}
                  {selectedOrder.payment_method ===
                  'credit-card'
                    ? 'Credit Card'
                    : selectedOrder.payment_method ===
                        'cash'
                      ? 'Cash on Delivery'
                      : 'Not available'}
                </p>
              </div>

              <h3>Ordered Products</h3>

              {orderItems.length === 0 ? (
                <p>
                  No products found for this
                  order.
                </p>
              ) : (
                <div style={tableWrapperStyle}>
                  <table style={tableStyle}>
                    <thead>
                      <tr
                        style={{
                          background:
                            '#f4f4f4'
                        }}
                      >
                        <th style={thStyle}>
                          Product
                        </th>

                        <th style={thStyle}>
                          Quantity
                        </th>

                        <th style={thStyle}>
                          Price
                        </th>

                        <th style={thStyle}>
                          Total
                        </th>
                      </tr>
                    </thead>

                    <tbody>
                      {orderItems.map(
                        (item) => (
                          <tr
                            key={item.id}
                            style={{
                              borderBottom:
                                '1px solid #ddd'
                            }}
                          >
                            <td style={tdStyle}>
                              {
                                item.product_name
                              }
                            </td>

                            <td style={tdStyle}>
                              {item.quantity}
                            </td>

                            <td style={tdStyle}>
                              ₪
                              {Number(
                                item.price_at_purchase
                              ).toFixed(2)}
                            </td>

                            <td style={tdStyle}>
                              ₪
                              {Number(
                                item.item_total
                              ).toFixed(2)}
                            </td>
                          </tr>
                        )
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {activeTab === 'users' && (
        <div>
          <h3>
            Registered Users ({users.length})
          </h3>

          {users.length === 0 ? (
            <p>No users found.</p>
          ) : (
            <div style={tableWrapperStyle}>
              <table style={tableStyle}>
                <thead>
                  <tr
                    style={{
                      background: '#f4f4f4'
                    }}
                  >
                    <th style={thStyle}>ID</th>
                    <th style={thStyle}>
                      Name
                    </th>
                    <th style={thStyle}>
                      Email
                    </th>
                    <th style={thStyle}>
                      Role
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {users.map((user) => (
                    <tr
                      key={user.id}
                      style={{
                        borderBottom:
                          '1px solid #ddd'
                      }}
                    >
                      <td style={tdStyle}>
                        {user.id}
                      </td>

                      <td style={tdStyle}>
                        {user.first_name}{' '}
                        {user.last_name}
                      </td>

                      <td style={tdStyle}>
                        {user.email}
                      </td>

                      <td style={tdStyle}>
                        <strong
                          style={{
                            color:
                              user.role ===
                              'admin'
                                ? '#e74c3c'
                                : '#27ae60'
                          }}
                        >
                          {user.role}
                        </strong>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {activeTab === 'products' && (
        <div>
          <h3>
            Products Inventory (
            {products.length})
          </h3>

          <form
            onSubmit={(event) => {
              event.preventDefault();

              if (editingProductId) {
                handleUpdateProduct(
                  editingProductId,
                  form
                );
              } else {
                handleAddProduct(event);
              }
            }}
            style={{
              background: '#f9f9f9',
              padding: '15px',
              borderRadius: '8px',
              marginBottom: '25px',
              border: '1px solid #ddd',
              display: 'grid',
              gridTemplateColumns:
                '1fr 1fr',
              gap: '10px'
            }}
          >
            <h4
              style={{
                gridColumn: 'span 2',
                margin: '0 0 10px'
              }}
            >
              {editingProductId
                ? 'Edit Product'
                : 'Add New Product'}
            </h4>

            <input
              type="text"
              placeholder="Product Name"
              value={form.name}
              onChange={(event) =>
                setForm({
                  ...form,
                  name: event.target.value
                })
              }
              required
              style={inputStyle}
            />

            <input
              type="number"
              placeholder="Price (₪)"
              value={form.price}
              onChange={(event) =>
                setForm({
                  ...form,
                  price: event.target.value
                })
              }
              min="0"
              step="0.01"
              required
              style={inputStyle}
            />

            <input
              type="number"
              placeholder="Stock Quantity"
              value={form.stock}
              onChange={(event) =>
                setForm({
                  ...form,
                  stock: event.target.value
                })
              }
              min="0"
              required
              style={inputStyle}
            />

            <select
              value={form.category}
              onChange={(event) =>
                setForm({
                  ...form,
                  category:
                    event.target.value
                })
              }
              style={inputStyle}
            >
              <option value="ingredients">
                Ingredients
              </option>

              <option value="equipment">
                Equipment
              </option>
            </select>

            <input
              type="text"
              placeholder="Image URL"
              value={form.image_url}
              onChange={(event) =>
                setForm({
                  ...form,
                  image_url:
                    event.target.value
                })
              }
              style={{
                ...inputStyle,
                gridColumn: 'span 2'
              }}
            />
<div
  style={{
    gridColumn: 'span 2',
    display: 'flex',
    flexWrap: 'wrap',
    gap: '10px',
    alignItems: 'center'
  }}
>
  <input
    type="file"
    accept="image/jpeg,image/png,image/webp"
    onChange={(event) =>
      setSelectedImage(
        event.target.files[0] || null
      )
    }
  />

  <button
    type="button"
    onClick={handleImageUpload}
    disabled={
      !selectedImage ||
      isUploadingImage
    }
    className="btn-primary"
  >
    {isUploadingImage
      ? 'Uploading...'
      : 'Upload Image'}
  </button>
</div>
            <input
              type="text"
              placeholder="Description"
              value={form.description}
              onChange={(event) =>
                setForm({
                  ...form,
                  description:
                    event.target.value
                })
              }
              style={{
                ...inputStyle,
                gridColumn: 'span 2'
              }}
            />

            <div
              style={{
                gridColumn: 'span 2',
                display: 'flex',
                gap: '10px'
              }}
            >
              <button
                type="submit"
                className="btn-primary"
                style={{
                  flex: 1,
                  padding: '10px',
                  cursor: 'pointer',
                  background:
                    editingProductId
                      ? '#f39c12'
                      : ''
                }}
              >
                {editingProductId
                  ? 'Update Product'
                  : 'Add Product to DB'}
              </button>

              {editingProductId && (
                <button
                  type="button"
                  onClick={() => {
                    setEditingProductId(null);
                    setForm(emptyProductForm);
                  }}
                  style={{
                    flex: 1,
                    padding: '10px',
                    cursor: 'pointer',
                    background: '#95a5a6',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '4px'
                  }}
                >
                  Cancel Edit
                </button>
              )}
            </div>
          </form>

          <div style={tableWrapperStyle}>
            <table style={tableStyle}>
              <thead>
                <tr
                  style={{
                    background: '#f4f4f4'
                  }}
                >
                  <th style={thStyle}>ID</th>
                  <th style={thStyle}>
                    Name
                  </th>
                  <th style={thStyle}>
                    Category
                  </th>
                  <th style={thStyle}>
                    Price
                  </th>
                  <th style={thStyle}>
                    Stock
                  </th>
                  <th style={thStyle}>
                    Actions
                  </th>
                </tr>
              </thead>

              <tbody>
                {products.map((product) => (
                  <tr
                    key={product.id}
                    style={{
                      borderBottom:
                        '1px solid #ddd'
                    }}
                  >
                    <td style={tdStyle}>
                      {product.id}
                    </td>

                    <td style={tdStyle}>
                      {product.name}
                    </td>

                    <td style={tdStyle}>
                      {product.category}
                    </td>

                    <td style={tdStyle}>
                      ₪{product.price}
                    </td>

                    <td style={tdStyle}>
                      <span
                        style={{
                          color:
                            Number(
                              product.stock
                            ) < 5
                              ? '#e74c3c'
                              : '#27ae60',
                          fontWeight: 'bold'
                        }}
                      >
                        {product.stock ??
                          'N/A'}
                      </span>
                    </td>

                    <td style={tdStyle}>
                      <button
                        onClick={() =>
                          handleEditClick(
                            product
                          )
                        }
                        style={editButtonStyle}
                      >
                        Edit
                      </button>

                      <button
                        onClick={() =>
                          handleDeleteProduct(
                            product.id
                          )
                        }
                        style={deleteButtonStyle}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

const tabStyle = (isActive) => ({
  padding: '10px 20px',
  cursor: 'pointer',
  background: isActive
    ? '#3498db'
    : '#f0f0f0',
  color: isActive ? '#fff' : '#333',
  border: 'none',
  borderRadius: '4px',
  fontWeight: 'bold',
  fontSize: '1rem'
});

const tableWrapperStyle = {
  width: '100%',
  overflowX: 'auto'
};

const tableStyle = {
  width: '100%',
  minWidth: '650px',
  borderCollapse: 'collapse',
  background: '#fff',
  boxShadow:
    '0 2px 4px rgba(0,0,0,0.05)'
};

const thStyle = {
  padding: '12px',
  textAlign: 'left',
  borderBottom: '2px solid #ddd'
};

const tdStyle = {
  padding: '12px',
  textAlign: 'left'
};

const inputStyle = {
  padding: '8px',
  borderRadius: '4px',
  border: '1px solid #ccc'
};

const selectStyle = {
  padding: '7px',
  border: '1px solid #ccc',
  borderRadius: '4px',
  backgroundColor: '#fff',
  cursor: 'pointer'
};

const viewButtonStyle = {
  padding: '7px 12px',
  border: 'none',
  borderRadius: '4px',
  backgroundColor: '#3498db',
  color: '#fff',
  cursor: 'pointer'
};

const editButtonStyle = {
  cursor: 'pointer',
  padding: '5px 10px',
  background: '#f39c12',
  color: '#fff',
  border: 'none',
  borderRadius: '4px',
  marginRight: '8px'
};

const deleteButtonStyle = {
  cursor: 'pointer',
  padding: '5px 10px',
  background: '#e74c3c',
  color: '#fff',
  border: 'none',
  borderRadius: '4px'
};