export interface EmailProvider {
  sendEmail(to: string, subject: string, htmlContent: string): Promise<void>;
}

export interface PushProvider {
  sendPush(token: string, title: string, body: string, payload?: any): Promise<void>;
}

export interface NotificationProvider {
  deliver(
    channel: 'EMAIL' | 'PUSH' | 'WEBSOCKET' | 'SMS',
    recipient: string,
    title: string,
    body: string,
    payload?: any
  ): Promise<void>;
}
