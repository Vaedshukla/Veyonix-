export interface AIProvider {
  chat(messages: Array<{ role: string; content: string }>): Promise<string>;
}

export interface EmbeddingProvider {
  embed(text: string): Promise<number[]>;
}

export interface BehaviorAnalysisProvider {
  analyzeUsagePattern(userId: string, activitySummary: any): Promise<{ riskScore: number; anomalies: string[] }>;
}
