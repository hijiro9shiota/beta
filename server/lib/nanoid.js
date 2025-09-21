import { randomBytes } from 'crypto';

export function nanoid(size = 12) {
  return randomBytes(size)
    .toString('base64')
    .replace(/[^a-zA-Z0-9]/g, '')
    .slice(0, size);
}
