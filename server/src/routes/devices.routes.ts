import { Router } from 'express'
import { protect } from '../middleware/auth.middleware'
import { perIpLimiter, perUserLimiter } from '../middleware/rateLimit.middleware'
import { connectDevice, deviceCallback, deviceSummary, listDevices, registerPhoneDevice, removeDevice, syncDevices } from '../controllers/devices.controller'

const router = Router()

// The one public route: the provider's sign-in page sends the person's browser here. Single-use state protects it.
router.get('/callback/:provider', perIpLimiter(30), deviceCallback)

router.use(protect)
router.use(perUserLimiter(40, 60 * 1000))

router.get('/', listDevices)
router.get('/summary', deviceSummary)
router.post('/sync', syncDevices)
router.post('/phone/:provider', registerPhoneDevice)
router.post('/:provider/connect', connectDevice)
router.post('/:provider/sync', syncDevices)
router.delete('/:provider', removeDevice)

export default router
