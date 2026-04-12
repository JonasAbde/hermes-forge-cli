/**
 * Notification system for Forge CLI
 * Supports desktop notifications, webhooks, and custom handlers
 */

import { execa } from 'execa';
import { writeFile, readFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { homedir } from 'os';
import { existsSync } from 'fs';

const NOTIFICATIONS_DIR = join(homedir(), '.forge', 'notifications');
const CONFIG_FILE = join(NOTIFICATIONS_DIR, 'config.json');

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

const DEFAULT_CONFIG: NotificationConfig = {
  enabled: true,
  channels: {
    desktop: true
  },
  rules: [
    { event: 'task:failed', channels: ['desktop'], minLevel: 'error' },
    { event: 'backup:completed', channels: ['desktop'], minLevel: 'success' },
    { event: 'service:crashed', channels: ['desktop'], minLevel: 'error' }
  ]
};

// Ensure directories exist
async function ensureDirectories(): Promise<void> {
  await mkdir(NOTIFICATIONS_DIR, { recursive: true });
}

// Load notification config
export async function loadConfig(): Promise<NotificationConfig> {
  await ensureDirectories();
  
  try {
    const content = await readFile(CONFIG_FILE, 'utf8');
    return { ...DEFAULT_CONFIG, ...JSON.parse(content) };
  } catch {
    return DEFAULT_CONFIG;
  }
}

// Save notification config
export async function saveConfig(config: NotificationConfig): Promise<void> {
  await ensureDirectories();
  await writeFile(CONFIG_FILE, JSON.stringify(config, null, 2));
}

// Send desktop notification
async function sendDesktopNotification(payload: NotificationPayload): Promise<void> {
  const { title, message, type } = payload;
  
  // Try different notification methods
  const methods = [
    // Linux - notify-send
    async () => {
      await execa('notify-send', [
        '-u', type === 'error' ? 'critical' : type === 'warning' ? 'normal' : 'low',
        '-t', '5000',
        title,
        message
      ]);
    },
    // macOS - osascript
    async () => {
      await execa('osascript', ['-e', `display notification "${message}" with title "${title}"`])
    },
    // Windows - PowerShell (simplified)
    async () => {
      const psScript = `
Add-Type -AssemblyName System.Windows.Forms
$notification = New-Object System.Windows.Forms.NotifyIcon
$notification.Icon = [System.Drawing.SystemIcons]::Information
$notification.BalloonTipTitle = "${title}"
$notification.BalloonTipText = "${message}"
$notification.Visible = $true
$notification.ShowBalloonTip(5000)
Start-Sleep -Milliseconds 5000
$notification.Dispose()
`;
      await execa('powershell', ['-Command', psScript]);
    }
  ];
  
  for (const method of methods) {
    try {
      await method();
      return; // Success
    } catch {
      // Try next method
    }
  }
  
  // If all fail, just log to console
  console.log(`[Notification] ${title}: ${message}`);
}

// Send webhook notification
async function sendWebhookNotification(
  payload: NotificationPayload,
  config: NonNullable<NotificationConfig['channels']['webhook']>
): Promise<void> {
  const body = JSON.stringify({
    title: payload.title,
    message: payload.message,
    type: payload.type,
    timestamp: new Date().toISOString(),
    metadata: payload.metadata
  });
  
  const response = await fetch(config.url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...config.headers
    },
    body
  });
  
  if (!response.ok) {
    throw new Error(`Webhook failed: ${response.status} ${response.statusText}`);
  }
}

// Send Slack notification
async function sendSlackNotification(
  payload: NotificationPayload,
  config: NonNullable<NotificationConfig['channels']['slack']>
): Promise<void> {
  const colorMap: Record<NotificationType, string> = {
    info: '#36a64f',
    success: '#36a64f',
    warning: '#daa520',
    error: '#ff0000'
  };
  
  const body = JSON.stringify({
    channel: config.channel,
    username: config.username || 'Forge CLI',
    attachments: [{
      color: colorMap[payload.type],
      title: payload.title,
      text: payload.message,
      footer: 'Forge CLI',
      ts: Math.floor(Date.now() / 1000)
    }]
  });
  
  const response = await fetch(config.slack.webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body
  });
  
  if (!response.ok) {
    throw new Error(`Slack notification failed: ${response.status}`);
  }
}

// Send Discord notification
async function sendDiscordNotification(
  payload: NotificationPayload,
  config: NonNullable<NotificationConfig['channels']['discord']>
): Promise<void> {
  const colorMap: Record<NotificationType, number> = {
    info: 3447003,
    success: 3066993,
    warning: 15105570,
    error: 15158332
  };
  
  const body = JSON.stringify({
    embeds: [{
      title: payload.title,
      description: payload.message,
      color: colorMap[payload.type],
      timestamp: new Date().toISOString(),
      footer: { text: 'Forge CLI' }
    }]
  });
  
  const response = await fetch(config.discord.webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body
  });
  
  if (!response.ok) {
    throw new Error(`Discord notification failed: ${response.status}`);
  }
}

// Main send function
export async function sendNotification(
  payload: NotificationPayload,
  channels?: NotificationChannel[]
): Promise<{ sent: string[]; failed: string[] }> {
  const config = await loadConfig();
  const sent: string[] = [];
  const failed: string[] = [];
  
  if (!config.enabled) {
    return { sent, failed };
  }
  
  const targetChannels = channels || ['desktop'];
  
  for (const channel of targetChannels) {
    try {
      switch (channel) {
        case 'desktop':
          if (config.channels.desktop) {
            await sendDesktopNotification(payload);
            sent.push('desktop');
          }
          break;
          
        case 'webhook':
          if (config.channels.webhook) {
            await sendWebhookNotification(payload, config.channels.webhook);
            sent.push('webhook');
          }
          break;
          
        case 'slack':
          if (config.channels.slack) {
            await sendSlackNotification(payload, config.channels.slack);
            sent.push('slack');
          }
          break;
          
        case 'discord':
          if (config.channels.discord) {
            await sendDiscordNotification(payload, config.channels.discord);
            sent.push('discord');
          }
          break;
          
        case 'email':
          // Email would require nodemailer or similar
          failed.push('email (not implemented)');
          break;
      }
    } catch (error: any) {
      failed.push(`${channel}: ${error.message}`);
    }
  }
  
  return { sent, failed };
}

// Check if notification should be sent based on rules
export async function shouldNotify(event: string, type: NotificationType): Promise<boolean> {
  const config = await loadConfig();
  
  if (!config.enabled) return false;
  
  const typePriority: Record<NotificationType, number> = {
    info: 0,
    success: 1,
    warning: 2,
    error: 3
  };
  
  return config.rules.some(rule => {
    if (rule.event !== event && !rule.event.endsWith('*')) return false;
    return typePriority[type] >= typePriority[rule.minLevel];
  });
}

// Convenience functions
export async function notifySuccess(title: string, message: string, metadata?: Record<string, unknown>): Promise<void> {
  await sendNotification({ title, message, type: 'success', metadata });
}

export async function notifyInfo(title: string, message: string, metadata?: Record<string, unknown>): Promise<void> {
  await sendNotification({ title, message, type: 'info', metadata });
}

export async function notifyWarning(title: string, message: string, metadata?: Record<string, unknown>): Promise<void> {
  await sendNotification({ title, message, type: 'warning', metadata });
}

export async function notifyError(title: string, message: string, metadata?: Record<string, unknown>): Promise<void> {
  await sendNotification({ title, message, type: 'error', metadata });
}

// Test all configured channels
export async function testNotifications(): Promise<{ results: Array<{ channel: string; success: boolean; error?: string }> }> {
  const config = await loadConfig();
  const results: Array<{ channel: string; success: boolean; error?: string }> = [];
  
  const testPayload: NotificationPayload = {
    title: 'Forge CLI Test',
    message: 'This is a test notification from Forge CLI',
    type: 'info'
  };
  
  const channels: NotificationChannel[] = ['desktop', 'webhook', 'slack', 'discord'];
  
  for (const channel of channels) {
    try {
      const { sent, failed } = await sendNotification(testPayload, [channel]);
      if (sent.includes(channel)) {
        results.push({ channel, success: true });
      } else {
        results.push({ channel, success: false, error: failed.find(f => f.startsWith(channel)) || 'Not configured' });
      }
    } catch (error: any) {
      results.push({ channel, success: false, error: error.message });
    }
  }
  
  return { results };
}
