import { Router } from 'express';
const router = Router();
// TODO: Implement in Task 2
router.get('/', (req, res) => res.json({ success: true, data: [] }));
export default router;
