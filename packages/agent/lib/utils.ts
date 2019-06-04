import uuid from 'uuid/v4'
import { IncomingMessage, ServerResponse, IncomingHttpHeaders } from 'http'
import { Nullable } from './types'
import url from 'url'
import forwareded from 'forwarded'

const iWantABuffer = (
  chunk: Buffer | string | null,
  encoding?: string | undefined
): Buffer => {
  if (chunk === null) {
    return Buffer.from('')
  }

  if (Buffer.isBuffer(chunk)) {
    return chunk
  }

  if (encoding === undefined) {
    return Buffer.from(chunk)
  }

  if (encoding === 'buffer') {
    return Buffer.from(chunk)
  }

  return Buffer.from(chunk, encoding as BufferEncoding)
}

const stringify = (
  body: Object | Array<any> | string | String | null | undefined
): Nullable<string> => {
  if (!body) {
    return null
  }

  if (typeof body === 'object' && Object.keys(body).length === 0) {
    return null
  }

  if (typeof body === 'string' || body instanceof String) {
    return body as string
  }

  return JSON.stringify(body)
}

export const HEADERS = {
  requestId: 'DeepTrace-Request-Id',
  parentRequestId: 'DeepTrace-Parent-Request-Id',
  rootRequestId: 'DeepTrace-Root-Request-Id'
}

const getHeaderCaseInsesitive = (
  headers: IncomingHttpHeaders,
  header: string
): Nullable<string> => {
  const key = Object.keys(headers)
    .map(key => key.toLowerCase())
    .filter(key => key.length === header.length)
    .find(key => key === header.toLowerCase())

  if (!key) {
    return null
  }

  return headers[key] as string
}

export function extractContextFromRequest(req: IncomingMessage) {
  const id = uuid()
  const parentid = getHeaderCaseInsesitive(req.headers, HEADERS.parentRequestId)
  const rootid =
    getHeaderCaseInsesitive(req.headers, HEADERS.rootRequestId) || id

  return { id, parentid, rootid }
}

type CustomRequest = IncomingMessage & { connection: { encrypted?: boolean } }

const getProtocol = async (req: CustomRequest) => {
  const proto = req.connection.encrypted ? 'https' : 'http'

  const header =
    getHeaderCaseInsesitive(req.headers, 'X-Forwarded-Proto') || proto
  const index = header.indexOf(',')

  return index !== -1 ? header.substring(0, index).trim() : header.trim()
}

const getHostAndPort = async (
  req: CustomRequest
): Promise<{ host: string | undefined; port: string | undefined }> => {
  let host = getHeaderCaseInsesitive(req.headers, 'X-Forwarded-Host')

  if (!host) {
    host = getHeaderCaseInsesitive(req.headers, 'Host')
  } else if (host.indexOf(',') !== -1) {
    host = host.substring(0, host.indexOf(',')).trimRight()
  }

  if (!host) return { host: undefined, port: undefined }

  // IPv6 literal support
  const offset = host[0] === '[' ? host.indexOf(']') + 1 : 0
  const index = host.indexOf(':', offset)

  return index !== -1
    ? { host: host.substring(0, index), port: host.substring(index + 1) }
    : { host, port: undefined }
}

const getClientIP = async (req: CustomRequest) => {
  return forwareded(req)[0] || null
}

export async function extractRequestInfo(
  req: IncomingMessage & { body?: any; ip?: string },
  debug: debug.Debugger
) {
  if (!req.hasOwnProperty('body')) {
    debug(
      'request body for trace "%s" was not capture because the property `req.body` does not exists, DeepTrace relies on body-parser for parsing request\'s body'
    )
  }

  const [ip, protocol, { host, port }, body] = await Promise.all([
    getClientIP(req as CustomRequest),
    getProtocol(req as CustomRequest),
    getHostAndPort(req as CustomRequest),
    (async () => (req.hasOwnProperty('body') ? stringify(req.body) : null))()
  ])

  return {
    ip,
    method: req.method,
    uri: url.format({
      protocol,
      hostname: host,
      port,
      pathname: req.url
    }),
    headers: req.headers,
    body
  }
}

export function rethrow(fn: (err: Error) => void) {
  return (err: Error): void => {
    fn(err)
    throw err
  }
}

export async function interceptResponseInfo(
  res: ServerResponse
): Promise<{ [key: string]: any }> {
  return new Promise(resolve => {
    const originalWrite = res.write.bind(res)
    const originalEnd = res.end.bind(res)
    const chunks: Buffer[] = []

    type WriteCb = (error: Error | undefined) => void
    function write(chunk: any, cb?: WriteCb): boolean
    function write(chunk: any, encoding: string, cb?: WriteCb): boolean
    function write(chunk: any, ...args: any[]): boolean {
      const encoding = typeof args[0] === 'string' ? args[0] : undefined

      chunks.push(iWantABuffer(chunk, encoding))
      return originalWrite(chunk, ...args)
    }

    type EndCb = () => void
    function end(cb?: EndCb): void
    function end(chunk: any, cb?: EndCb): void
    function end(chunk: any, encoding: string, cb?: EndCb): void
    function end(...args: any[]): void {
      const chunk =
        typeof args[0] !== 'function' ? (args[0] as Buffer | string) : undefined

      const encoding = typeof args[1] === 'string' ? args[1] : undefined

      if (chunk) {
        chunks.push(iWantABuffer(chunk, encoding))
      }

      resolve({
        status: res.statusCode,
        headers: { ...res.getHeaders() },
        body: Buffer.concat(chunks).toString('utf-8'),
        timestamp: new Date()
      })

      originalEnd(...args)
    }

    Object.assign(res, { end, write })
  })
}