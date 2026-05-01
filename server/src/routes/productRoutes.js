import { Router } from 'express';
import { optionalAuth, requireAuth } from '../middleware/auth.js';
import { createOrder, getMyOrders, getProductDetail, listProductCategories, listProducts } from '../controllers/productController.js';

const router = Router();

router.get('/categories', listProductCategories);
router.get('/products', optionalAuth, listProducts);
router.get('/products/:id', optionalAuth, getProductDetail);
router.post('/orders', requireAuth, createOrder);
router.get('/orders', requireAuth, getMyOrders);

export default router;
