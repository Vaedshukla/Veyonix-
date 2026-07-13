export interface PolicyCreatedEvent {
  type: 'POLICY_CREATED';
  policyId: string;
  timestamp: Date;
}

export interface PolicyUpdatedEvent {
  type: 'POLICY_UPDATED';
  policyId: string;
  versionNumber: number;
  timestamp: Date;
}

export interface PolicyAssignedEvent {
  type: 'POLICY_ASSIGNED';
  assignmentId: string;
  policyId: string;
  targetType: string;
  targetId: string;
  timestamp: Date;
}

export interface PolicyCompiledEvent {
  type: 'POLICY_COMPILED';
  deviceId: string;
  hash: string;
  timestamp: Date;
}
