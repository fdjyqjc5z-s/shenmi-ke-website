import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { createOrder, getMyOrders, getProductDetail, listProducts } from '../controllers/productController.js';

const router = Router();

router.get('/products', listProducts);
router.get('/products/:id', getProductDetail);
router.post('/orders', requireAuth, createOrder);
router.get('/orders', requireAuth, getMyOrders);

export default router;
