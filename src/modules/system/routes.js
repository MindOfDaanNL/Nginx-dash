const express = require('express');
const router = express.Router();
const { requireAuth, requireAdmin } = require('../../middleware/authentication');
const { issueCsrfToken, csrfMiddleware } = require('../../middleware/csrf');
const systemCtrl = require('./controller');

router.get('/api/system/status', requireAuth, systemCtrl.getStatus);
router.post('/api/system/start', requireAuth, requireAdmin, issueCsrfToken, csrfMiddleware, systemCtrl.start);
router.post('/api/system/stop', requireAuth, requireAdmin, issueCsrfToken, csrfMiddleware, systemCtrl.stop);
router.post('/api/system/restart', requireAuth, requireAdmin, issueCsrfToken, csrfMiddleware, systemCtrl.restart);
router.post('/api/system/reload', requireAuth, requireAdmin, issueCsrfToken, csrfMiddleware, systemCtrl.reload);
router.post('/api/system/test', requireAuth, requireAdmin, issueCsrfToken, csrfMiddleware, systemCtrl.test);

router.get('/system', requireAuth, systemCtrl.systemPage);

module.exports = router;