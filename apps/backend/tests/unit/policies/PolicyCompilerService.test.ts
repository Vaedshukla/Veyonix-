import { PolicyCompilerService, ApplicablePolicy } from '../../../src/modules/policies/domain/services/PolicyCompilerService';
import { TargetType } from '../../../src/modules/policies/domain/entities/PolicyAssignment.entity';

describe('PolicyCompilerService', () => {
  let service: PolicyCompilerService;

  beforeEach(() => {
    service = new PolicyCompilerService();
  });

  it('should deep merge policies respecting target type hierarchy (Global -> Device)', () => {
    const globalPol: ApplicablePolicy = {
      assignment: { id: 'a1', policyId: 'p1', targetType: TargetType.GLOBAL, targetId: 'g', priority: 0, createdAt: new Date() },
      version: { id: 'v1', policyId: 'p1', versionNumber: 1, payload: { settingA: 1, settingB: 1 }, createdAt: new Date(), createdBy: 'admin' }
    };
    
    const orgPol: ApplicablePolicy = {
      assignment: { id: 'a2', policyId: 'p2', targetType: TargetType.ORG, targetId: 'o', priority: 0, createdAt: new Date() },
      version: { id: 'v2', policyId: 'p2', versionNumber: 1, payload: { settingB: 2, nested: { x: 1 } }, createdAt: new Date(), createdBy: 'admin' }
    };
    
    const devicePol: ApplicablePolicy = {
      assignment: { id: 'a3', policyId: 'p3', targetType: TargetType.DEVICE, targetId: 'd', priority: 0, createdAt: new Date() },
      version: { id: 'v3', policyId: 'p3', versionNumber: 1, payload: { nested: { y: 2 } }, createdAt: new Date(), createdBy: 'admin' }
    };

    // pass out of order to ensure sort works
    const result = service.compile([devicePol, globalPol, orgPol]);

    expect(result).toEqual({
      settingA: 1, // from global
      settingB: 2, // from org overrides global
      nested: {
        x: 1, // from org
        y: 2  // from device
      }
    });
  });

  it('should respect priority for horizontal conflicts (same target type)', () => {
    const orgPol1: ApplicablePolicy = {
      assignment: { id: 'a1', policyId: 'p1', targetType: TargetType.ORG, targetId: 'o', priority: 10, createdAt: new Date() },
      version: { id: 'v1', policyId: 'p1', versionNumber: 1, payload: { a: 'org1' }, createdAt: new Date(), createdBy: 'admin' }
    };

    const orgPol2: ApplicablePolicy = {
      assignment: { id: 'a2', policyId: 'p2', targetType: TargetType.ORG, targetId: 'o', priority: 20, createdAt: new Date() },
      version: { id: 'v2', policyId: 'p2', versionNumber: 1, payload: { a: 'org2' }, createdAt: new Date(), createdBy: 'admin' }
    };

    // orgPol2 has higher priority (20 > 10) so it should win
    const result = service.compile([orgPol2, orgPol1]);

    expect(result).toEqual({
      a: 'org2'
    });
  });
});
