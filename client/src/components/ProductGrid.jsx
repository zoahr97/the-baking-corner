
const getRemainingStock = (product, cart) => {
  const cartItem = cart.find(
    (item) => Number(item.id) === Number(product.id)
  );

  const quantityInCart = cartItem
    ? Number(cartItem.quantity)
    : 0;

  return Math.max(
    0,
    Number(product.stock) - quantityInCart
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
      const remainingStock = getRemainingStock(
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
                color: 'var(--text-muted)',
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
                color: 'var(--text-main)'
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
              onClick={() => onAddToCart(item)}
              disabled={Number(item.stock) <= 0}
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
export default ProductGrid;