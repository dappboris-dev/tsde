import { createHash } from 'crypto';
export function sha256Hex(input: string | Buffer, encoding: BufferEncoding = 'utf8'): string {
  const h = createHash('sha256');
  if (typeof input === 'string') h.update(Buffer.from(input, encoding));
  else h.update(input);
  return h.digest('hex');
}
export function sha256Base64(input: string | Buffer, encoding: BufferEncoding = 'utf8'): string {
  const h = createHash('sha256');
  if (typeof input === 'string') h.update(Buffer.from(input, encoding));
  else h.update(input);
  return h.digest('base64');
}