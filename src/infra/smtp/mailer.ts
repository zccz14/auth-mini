import nodemailer from 'nodemailer'
import type { DatabaseClient } from '../db/client.js'
import type { AppLogger } from '../../shared/logger.js'

export type SmtpConfig = {
  id: number
  host: string
  port: number
  username: string
  password: string
  fromEmail: string
  fromName?: string
  secure?: boolean
  isActive: boolean
  weight?: number
}

export type NormalizedSmtpConfig = Omit<
  SmtpConfig,
  'fromName' | 'secure' | 'weight'
> & {
  fromName: string
  secure: boolean
  weight: number
}

export type MailMessage = {
  from: string
  to: string
  subject: string
  text: string
}

type SmtpConfigRow = {
  id: number
  host: string
  port: number
  username: string
  password: string
  from_email: string
  from_name: string
  secure: number
  is_active: number
  weight: number
}

export function listSmtpConfigs(db: DatabaseClient): NormalizedSmtpConfig[] {
  const rows = db
    .prepare(
      [
        'SELECT id, host, port, username, password, from_email, from_name, secure, is_active, weight',
        'FROM smtp_configs',
        'ORDER BY id ASC'
      ].join(' ')
    )
    .all() as SmtpConfigRow[]

  return rows.map((row) =>
    normalizeSmtpConfig({
      id: row.id,
      host: row.host,
      port: row.port,
      username: row.username,
      password: row.password,
      fromEmail: row.from_email,
      fromName: row.from_name,
      secure: row.secure === 1,
      isActive: row.is_active === 1,
      weight: row.weight
    })
  )
}

export function selectSmtpConfig(
  configs: SmtpConfig[],
  random: () => number = Math.random
): NormalizedSmtpConfig | null {
  const activeConfigs = configs
    .map(normalizeSmtpConfig)
    .filter((config) => config.isActive)

  if (activeConfigs.length === 0) {
    return null
  }

  const totalWeight = activeConfigs.reduce(
    (sum, config) => sum + config.weight,
    0
  )
  let remaining = random() * totalWeight

  for (const config of activeConfigs) {
    remaining -= config.weight

    if (remaining < 0) {
      return config
    }
  }

  return activeConfigs.at(-1) ?? null
}

export async function sendOtpMail(
  config: SmtpConfig,
  email: string,
  code: string,
  options?: { logger?: AppLogger }
): Promise<void> {
  const smtpConfig = normalizeSmtpConfig(config)
  await sendMailWithNodemailer(
    smtpConfig,
    buildOtpMessage(smtpConfig, email, code),
    options
  )
}

export function buildSecureSmtpOptions(
  config: Pick<NormalizedSmtpConfig, 'host' | 'port'>
): { host: string; port: number; servername: string } {
  return {
    host: config.host,
    port: config.port,
    servername: config.host
  }
}

function normalizeSmtpConfig(config: SmtpConfig): NormalizedSmtpConfig {
  return {
    ...config,
    fromName: config.fromName ?? '',
    secure: config.secure ?? false,
    weight: config.weight ?? 1
  }
}

async function sendMailWithNodemailer(
  config: NormalizedSmtpConfig,
  message: MailMessage,
  options?: { logger?: AppLogger }
): Promise<void> {
  options?.logger?.info(
    {
      event: 'smtp.send.attempted',
      email: message.to,
      smtp_config_id: config.id,
      smtp_host: config.host,
      smtp_port: config.port
    },
    'SMTP send attempted'
  )

  try {
    const transport = nodemailer.createTransport(buildTransportOptions(config))
    const info = await transport.sendMail(message)

    if (
      !recipientExists(info.accepted, message.to) ||
      recipientExists(info.rejected, message.to)
    ) {
      throw new Error(`SMTP delivery failed for ${message.to}`)
    }

    options?.logger?.info(
      {
        event: 'smtp.send.succeeded',
        email: message.to,
        smtp_config_id: config.id,
        smtp_host: config.host,
        smtp_port: config.port
      },
      'SMTP send succeeded'
    )
  } catch (error) {
    options?.logger?.warn(
      {
        event: 'smtp.send.failed',
        email: message.to,
        smtp_config_id: config.id,
        smtp_host: config.host,
        smtp_port: config.port
      },
      'SMTP send failed'
    )
    throw error
  }
}

function buildOtpMessage(
  config: NormalizedSmtpConfig,
  email: string,
  code: string
): MailMessage {
  const from = config.fromName
    ? `${config.fromName} <${config.fromEmail}>`
    : config.fromEmail

  return {
    from,
    to: email,
    subject: 'Your mini-auth verification code',
    text: `Your verification code is ${code}. It expires in 10 minutes.`
  }
}

function buildTransportOptions(config: NormalizedSmtpConfig) {
  return {
    host: config.host,
    port: config.port,
    secure: config.secure,
    auth: {
      user: config.username,
      pass: config.password
    },
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 10000
  }
}

function recipientExists(
  recipients: Array<string | { address?: string | null }> | undefined,
  target: string
): boolean {
  return (
    recipients?.some((recipient) =>
      typeof recipient === 'string'
        ? recipient === target
        : recipient.address === target
    ) ?? false
  )
}
