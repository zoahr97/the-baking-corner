const { uploadProductImage } = require('../middlewares/uploadMiddleware');

const uploadImage = (req, res) => {
  uploadProductImage.single('image')(req, res, (error) => {
    if (error) return res.status(400).json({ error: error.message });
    if (!req.file) return res.status(400).json({ error: 'Please select an image' });

    const imageUrl = `${req.protocol}://${req.get('host')}/uploads/products/${req.file.filename}`;
    res.status(201).json({ message: 'Image uploaded successfully', imageUrl });
  });
};

module.exports = { uploadImage };