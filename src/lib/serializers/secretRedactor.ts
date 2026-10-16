/**
 * Utilities for masking sensitive values in exported configurations.
 */

export function maskSecretValue(key: string, value: string, shouldMask: boolean): string {
  if (!shouldMask) return value;
  if (!value) return value;

  // Already placeholder
  if (value.startsWith('${') && value.endsWith('}')) {
    return value;
  }

  const upperKey = key.toUpperCase();
  const isLikelySecret =
    upperKey.includes('KEY') ||
    upperKey.includes('SECRET') ||
    upperKey.includes('TOKEN') ||
    upperKey.includes('AUTH') ||
    upperKey.includes('PASSWORD') ||
    upperKey.includes('PASSWD') ||
    upperKey.includes('CREDENTIAL');

  if (isLikelySecret) {
    return `\${YOUR_${upperKey}}`;
  }

  return value;
}

export function maskHeaders(headers: Record<string, string> | undefined, shouldMask: boolean): Record<string, string> | undefined {
  if (!headers) return undefined;
  const result: Record<string, string> = {};
  for (const [k, v] of Object.entries(headers)) {
    if (k.toLowerCase() === 'authorization' && shouldMask) {
      if (v.startsWith('${') && v.endsWith('}')) {
        result[k] = v;
      } else {
        result[k] = 'Bearer ${YOUR_API_TOKEN}';
      }
    } else {
      result[k] = maskSecretValue(k, v, shouldMask);
    }
  }
  return result;
}

export function maskEnv(env: Record<string, string> | undefined, shouldMask: boolean): Record<string, string> | undefined {
  if (!env) return undefined;
  const result: Record<string, string> = {};
  for (const [k, v] of Object.entries(env)) {
    result[k] = maskSecretValue(k, v, shouldMask);
  }
  return result;
}
