import { Router } from 'express';
const router = Router();
// TODO: Implement in Task 3
router.get('/assessment/:hash', (req, res) => res.json({ success: true, data: null }));
export default router;
