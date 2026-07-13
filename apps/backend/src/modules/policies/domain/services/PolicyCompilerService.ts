import { PolicyVersion } from '../entities/PolicyVersion.entity';
import { PolicyAssignment, TargetType } from '../entities/PolicyAssignment.entity';

export interface ApplicablePolicy {
  assignment: PolicyAssignment;
  version: PolicyVersion;
}

export class PolicyCompilerService {
  private targetTypeOrder: Record<TargetType, number> = {
    [TargetType.GLOBAL]: 1,
    [TargetType.ORG]: 2,
    [TargetType.GROUP]: 3,
    [TargetType.USER]: 4,
    [TargetType.DEVICE]: 5,
  };

  /**
   * Compiles an effective policy given a list of applicable policies.
   * Policies should be sorted by hierarchy and priority before merging.
   * Target order: GLOBAL -> ORG -> GROUP -> USER -> DEVICE (highest priority overrides lower).
   * For horizontal conflicts (same target type), higher priority integer wins.
   */
  public compile(applicablePolicies: ApplicablePolicy[]): Record<string, any> {
    // Sort policies
    const sorted = [...applicablePolicies].sort((a, b) => {
      const typeOrderA = this.targetTypeOrder[a.assignment.targetType];
      const typeOrderB = this.targetTypeOrder[b.assignment.targetType];
      
      if (typeOrderA !== typeOrderB) {
        return typeOrderA - typeOrderB; // Lower number (Global) first, so it gets overridden
      }
      
      // Same level (horizontal conflict)
      return a.assignment.priority - b.assignment.priority; // Lower integer first, so higher integer overrides
    });

    let mergedPayload: Record<string, any> = {};

    for (const policy of sorted) {
      mergedPayload = this.deepMerge(mergedPayload, policy.version.payload);
    }

    return mergedPayload;
  }

  private deepMerge(target: Record<string, any>, source: Record<string, any>): Record<string, any> {
    const output = { ...target };
    if (this.isObject(target) && this.isObject(source)) {
      Object.keys(source).forEach(key => {
        if (this.isObject(source[key])) {
          if (!(key in target)) {
            Object.assign(output, { [key]: source[key] });
          } else {
            output[key] = this.deepMerge(target[key], source[key]);
          }
        } else {
          Object.assign(output, { [key]: source[key] });
        }
      });
    }
    return output;
  }

  private isObject(item: any): boolean {
    return (item && typeof item === 'object' && !Array.isArray(item));
  }
}
