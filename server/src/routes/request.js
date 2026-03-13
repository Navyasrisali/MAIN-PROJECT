const express = require('express');
const RequestController = require('../controllers/requestController');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

// All request routes require authentication
router.use(authMiddleware);

// Request management routes
router.post('/', RequestController.createRequest);
router.put('/:id/respond', RequestController.respondToRequest);
router.put('/:id/complete', RequestController.completeSession);

// Debug routes (remove in production)
router.get('/debug/sessions', RequestController.debugSessions);

module.exports = router;