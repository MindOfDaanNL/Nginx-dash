const express = require('express')
const router = express.Router()
const { requireAuth, requireAdmin } = require('../../middleware/authentication')
const { issueCsrfToken, csrfMiddleware } = require('../../middleware/csrf')
const { asyncHandler } = require('../../utils/asyncHandler')
const ctrl = require('./controller')

router.get('/api/ssl/certificates', requireAuth, asyncHandler(ctrl.listCertificates))
router.get('/api/ssl/certificates/:id', requireAuth, asyncHandler(ctrl.getCertificate))
router.post('/api/ssl/request', requireAuth, requireAdmin, issueCsrfToken, csrfMiddleware, asyncHandler(ctrl.requestCertificate))
router.post('/api/ssl/renew', requireAuth, requireAdmin, issueCsrfToken, csrfMiddleware, asyncHandler(ctrl.renewCertificate))
router.delete('/api/ssl/certificates/:id', requireAuth, requireAdmin, csrfMiddleware, asyncHandler(ctrl.deleteCertificate))

module.exports = router
