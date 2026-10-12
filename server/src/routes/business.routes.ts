import { Router } from 'express'
import { protect } from '../middleware/auth.middleware'
import { adminByEmail, loadApprovedBusiness, requireAccess } from '../middleware/business.middleware'
import { businessApplyLimiter } from '../middleware/rateLimit.middleware'
import * as c from '../controllers/business.controller'

const router = Router()
router.use(protect)

// Any signed-in user
router.post('/apply', businessApplyLimiter, c.apply)
router.get('/me', c.getMe)
router.get('/memberships', c.getMemberships)

// Reviewers
router.get('/admin/status', c.adminStatus)
router.get('/admin/applications', adminByEmail, c.adminList)
router.post('/admin/applications/:id/approve', adminByEmail, c.adminApprove)
router.post('/admin/applications/:id/reject', adminByEmail, c.adminReject)
router.post('/admin/applications/:id/revoke', adminByEmail, c.adminRevoke)

// Approved businesses, by role
router.use(loadApprovedBusiness)
router.get('/stats', requireAccess('reports', 'read'), c.getStats)

router.get('/members', requireAccess('members', 'read'), c.listMembers)
router.post('/members', requireAccess('members', 'write'), c.createMember)
router.patch('/members/:id', requireAccess('members', 'write'), c.updateMember)
router.delete('/members/:id', requireAccess('members', 'write'), c.deleteMember)

router.get('/plans', requireAccess('plans', 'read'), c.listPlans)
router.post('/plans', requireAccess('plans', 'write'), c.createPlan)
router.delete('/plans/:id', requireAccess('plans', 'write'), c.deletePlan)

router.get('/meal-plans', requireAccess('nutrition', 'read'), c.listMealPlans)
router.post('/meal-plans', requireAccess('nutrition', 'write'), c.createMealPlan)
router.delete('/meal-plans/:id', requireAccess('nutrition', 'write'), c.deleteMealPlan)

router.get('/foods', requireAccess('nutrition', 'read'), c.listFoods)
router.post('/foods', requireAccess('nutrition', 'write'), c.createFood)
router.delete('/foods/:id', requireAccess('nutrition', 'write'), c.deleteFood)

router.get('/staff', requireAccess('settings', 'read'), c.listStaff)
router.post('/staff', requireAccess('settings', 'write'), c.createStaff)
router.delete('/staff/:id', requireAccess('settings', 'write'), c.deleteStaff)
router.patch('/profile', requireAccess('settings', 'write'), c.updateProfile)

export default router
