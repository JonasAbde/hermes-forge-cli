/**
 * Notification system for Forge CLI
 * Supports desktop notifications, webhooks, and custom handlers
 */
export type NotificationType = 'info' | 'success' | 'warning' | 'error';
export type NotificationChannel = 'desktop' | 'webhook' | 'slack' | 'discord' | 'email';
export interface NotificationConfig {
    enabled: boolean;
    channels: {
        desktop?: boolean;
        webhook?: {
            url: string;
            headers?: Record<string, string>;
        };
        slack?: {
            webhookUrl: string;
            channel?: string;
            username?: string;
        };
        discord?: {
            webhookUrl: string;
        };
        email?: {
            smtpHost: string;
            smtpPort: number;
            username: string;
            password: string;
            from: string;
            to: string;
        };
    };
    rules: Array<{
        event: string;
        channels: NotificationChannel[];
        minLevel: NotificationType;
    }>;
}
export interface NotificationPayload {
    title: string;
    message: string;
    type: NotificationType;
    metadata?: Record<string, unknown>;
}
export declare function loadConfig(): Promise<NotificationConfig>;
export declare function saveConfig(config: NotificationConfig): Promise<void>;
export declare function sendNotification(payload: NotificationPayload, channels?: NotificationChannel[]): Promise<{
    sent: string[];
    failed: string[];
}>;
export declare function shouldNotify(event: string, type: NotificationType): Promise<boolean>;
export declare function notifySuccess(title: string, message: string, metadata?: Record<string, unknown>): Promise<void>;
export declare function notifyInfo(title: string, message: string, metadata?: Record<string, unknown>): Promise<void>;
export declare function notifyWarning(title: string, message: string, metadata?: Record<string, unknown>): Promise<void>;
export declare function notifyError(title: string, message: string, metadata?: Record<string, unknown>): Promise<void>;
export declare function testNotifications(): Promise<{
    results: Array<{
        channel: string;
        success: boolean;
        error?: string;
    }>;
}>;
//# sourceMappingURL=notifications.d.ts.map