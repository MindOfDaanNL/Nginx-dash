const express = require('express');
const router = express.Router();
const { requireAuth, requireAdmin } = require('../../middleware/authentication');
const { issueCsrfToken, csrfMiddleware } = require('../../middleware/csrf');
const ctrl = require('./controller');

router.get('/api/nginx/configs', requireAuth, ctrl.listConfigs);
router.get('/api/nginx/configs/:id', requireAuth, ctrl.getConfig);
router.post('/api/nginx/configs', requireAuth, requireAdmin, issueCsrfToken, csrfMiddleware, ctrl.createConfig);
router.put('/api/nginx/configs/:id', requireAuth, requireAdmin, issueCsrfToken, csrfMiddleware, ctrl.updateConfig);
router.delete('/api/nginx/configs/:id', requireAuth, requireAdmin, csrfMiddleware, ctrl.deleteConfig);
router.post('/api/nginx/configs/:id/enable', requireAuth, requireAdmin, csrfMiddleware, ctrl.toggleConfig);
router.post('/api/nginx/configs/:id/disable', requireAuth, requireAdmin, csrfMiddleware, ctrl.toggleConfig);
router.post('/api/nginx/test', requireAuth, requireAdmin, csrfMiddleware, ctrl.testConfig);
router.post('/api/nginx/reload', requireAuth, requireAdmin, csrfMiddleware, ctrl.reloadConfig);
router.get('/api/nginx/status', requireAuth, ctrl.nginxStatus);
router.post('/api/nginx/start', requireAuth, requireAdmin, csrfMiddleware, ctrl.nginxStart);
router.post('/api/nginx/stop', requireAuth, requireAdmin, csrfMiddleware, ctrl.nginxStop);
router.post('/api/nginx/restart', requireAuth, requireAdmin, csrfMiddleware, ctrl.nginxRestart);

module.exports = router;