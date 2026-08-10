const productModel = require('../models/productModel');

// שליפת כל המוצרים
const getAllProducts = async (req, res) => {
  try {
    const products = await productModel.getAll();
    res.json(products);
  } catch (error) {
    console.error('Error fetching products:', error);
    res.status(500).json({ error: 'Failed to fetch products' });
  }
};

// הוספת מוצר חדש (אדמין)
const createProduct = async (req, res) => {
  try {
    const insertId = await productModel.create(req.body);
    res.status(201).json({ id: insertId, ...req.body });
  } catch (error) {
    console.error('Error adding product:', error);
    res.status(500).json({ error: 'Failed to add product' });
  }
};

// עדכון מוצר (אדמין)
const updateProduct = async (req, res) => {
  const { id } = req.params;
  try {
    const affectedRows = await productModel.update(id, req.body);
    if (affectedRows === 0) return res.status(404).json({ error: 'Product not found' });
    res.json({ message: 'Product updated successfully' });
  } catch (error) {
    console.error('Error updating product:', error);
    res.status(500).json({ error: 'Failed to update product' });
  }
};

// מחיקת מוצר (אדמין)
const deleteProduct = async (req, res) => {
  const { id } = req.params;
  try {
    const affectedRows = await productModel.remove(id);
    if (affectedRows === 0) return res.status(404).json({ error: 'Product not found' });
    res.json({ message: 'Product deleted successfully' });
  } catch (error) {
    console.error('Error deleting product:', error);
    res.status(500).json({ error: 'Failed to delete product. It may belong to an existing order.' });
  }
};

module.exports = {
  getAllProducts,
  createProduct,
  updateProduct,
  deleteProduct
};