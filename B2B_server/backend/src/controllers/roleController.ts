import { Response, NextFunction } from 'express';
import { authService } from '../services/authService';
import ResponseUtil, { ErrorMessages, ValidationError } from '../utils/response';
import { AuthenticatedRequest } from '../middleware/authMiddleware';

class RoleController {
  /**
   * Validate role input for assigning/updating user role
   */
  private validateRoleInput(body: any): ValidationError[] {
    const { role } = body;
    const errors: ValidationError[] = [];

    if (!role) {
      errors.push({ field: 'role', message: 'Role is required' });
    }

    if (role && typeof role !== 'string') {
      errors.push({ field: 'role', message: 'Role must be a string' });
    }

    return errors;
  }

  /**
   * GET /roles - return all available roles
   * Public endpoint
   */
  async getRoles(req: any, res: Response, next: NextFunction): Promise<void> {
    try {
  const roles = await authService.getAllRoles();
  ResponseUtil.success(res, 'Roles fetched successfully', roles);
    } catch (error) {
      console.error('Get roles controller error:', error);
      ResponseUtil.serverError(res, ErrorMessages.SERVER_ERROR);
    }
  }

  /**
   * GET /roles/status - check if logged-in user has a role assigned
   * Protected endpoint (requires JWT)
   */
  async getRoleStatus(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user || !req.user.userId) {
        ResponseUtil.unauthorized(res, 'User not authenticated');
        return;
      }

      const userId = req.user.userId;

      // Check if user has a role assigned
      const roleData = await authService.getUserRole(userId);

      if (roleData) {
        ResponseUtil.success(res, 'Role found', roleData);
      } else {
        ResponseUtil.notFound(res, 'Role not found');
      }
    } catch (error) {
      console.error('Get role status controller error:', error);
      ResponseUtil.serverError(res, ErrorMessages.SERVER_ERROR);
    }
  }

  /**
   * POST /roles - assign or update role for authenticated user
   * Protected endpoint (requires JWT)
   */
  async assignRole(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user || !req.user.userId) {
        ResponseUtil.unauthorized(res, 'User not authenticated');
        return;
      }

      const validationErrors = this.validateRoleInput(req.body);
      if (validationErrors.length > 0) {
        ResponseUtil.validationError(res, ErrorMessages.VALIDATION_FAILED, validationErrors);
        return;
      }

      const { role } = req.body;
      const userId = req.user.userId;

      // Assign or update role for user
      const result = await authService.assignOrUpdateUserRole(userId, role);

  ResponseUtil.success(res, 'Role assigned/updated successfully', result);
    } catch (error) {
      console.error('Assign role controller error:', error);

      if (error instanceof Error && error.message.includes('Role') && error.message.includes('not found')) {
        ResponseUtil.notFound(res, error.message);
        return;
      }

      if (error instanceof Error && error.message === 'User not found') {
        ResponseUtil.notFound(res, 'User not found');
        return;
      }

      ResponseUtil.serverError(res, ErrorMessages.SERVER_ERROR);
    }
  }
}

export const roleController = new RoleController();
export default roleController;
