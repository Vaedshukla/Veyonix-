export interface PolicyVersion {
  id: string;
  policyId: string;
  versionNumber: number;
  payload: Record<string, any>;
  createdAt: Date;
  createdBy: string;
}
