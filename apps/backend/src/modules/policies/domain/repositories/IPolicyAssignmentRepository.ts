import { PolicyAssignment } from '../entities/PolicyAssignment.entity';

export interface IPolicyAssignmentRepository {
  createAssignment(assignment: PolicyAssignment): Promise<void>;
  findByTarget(targetType: string, targetId: string): Promise<PolicyAssignment[]>;
  /**
   * Returns all assignments that apply to a specific device, including 
   * its user, groups, org, and global.
   * Sorted by hierarchy and priority for compilation.
   */
  findApplicableForDevice(deviceId: string): Promise<PolicyAssignment[]>;
}
