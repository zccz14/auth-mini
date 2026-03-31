import type { DatabaseClient } from '../db/client.js'

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

export type SmtpTransport = {
  send(message: MailMessage): Promise<void>
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
  transport: SmtpTransport,
  config: NormalizedSmtpConfig,
  email: string,
  code: string
): Promise<void> {
  const from = config.fromName
    ? `${config.fromName} <${config.fromEmail}>`
    : config.fromEmail

  await transport.send({
    from,
    to: email,
    subject: 'Your mini-auth verification code',
    text: `Your verification code is ${code}. It expires in 10 minutes.`
  })
}

function normalizeSmtpConfig(config: SmtpConfig): NormalizedSmtpConfig {
  return {
    ...config,
    fromName: config.fromName ?? '',
    secure: config.secure ?? false,
    weight: config.weight ?? 1
  }
}
