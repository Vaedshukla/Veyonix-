export enum TargetType {
  GLOBAL = 'GLOBAL',
  ORG = 'ORG',
  GROUP = 'GROUP',
  USER = 'USER',
  DEVICE = 'DEVICE'
}

export interface PolicyAssignment {
  id: string;
  policyId: string;
  targetType: TargetType;
  targetId: string;
  priority: number;
  createdAt: Date;
}
