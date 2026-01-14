import { Router } from 'express';
import { authenticateToken } from '../middleware/authMiddleware';
import { uploadResumeEvaluation } from '../middleware/multerConfig';
import { resumeEvaluationController } from '../controllers/resumeEvaluationController';

const router = Router();

router.post('/evaluate',
  authenticateToken,
  (req, res, next) => {
    uploadResumeEvaluation(req, res, (err: any) => {
      if (err) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return res.status(400).json({
            status: 400,
            message: 'File size limit exceeded',
            success: false,
            errors: [{
              field: 'file',
              message: `File size must be less than ${req.app.get('MAX_FILE_SIZE_MB') || 10}MB`
            }]
          });
        }
        if (err.code === 'LIMIT_UNEXPECTED_FILE') {
          return res.status(400).json({
            status: 400,
            message: 'Unexpected file field',
            success: false,
            errors: [{
              field: 'file',
              message: 'Expected field name: file'
            }]
          });
        }
        if (err.message && err.message.includes('Invalid file format')) {
          return res.status(400).json({
            status: 400,
            message: 'Invalid file format',
            success: false,
            errors: [{
              field: 'file',
              message: err.message
            }]
          });
        }
        return next(err);
      }
      next();
    });
  },
  (req, res) => {
    resumeEvaluationController.evaluateResume(req as any, res);
  }
);

export default router;


