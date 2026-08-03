import { onlyDigits, normHandle } from './format';

export function findRegistryBySocial(registry, social) {
  const s = String(social || '').toLowerCase();
  if (!s) return null;
  return registry.find((r) => r.social.toLowerCase() === s) || null;
}

export function findRegistryByPhone(registry, rawPhone) {
  const d = onlyDigits(rawPhone);
  if (d.length < 8) return null;
  return registry.find((r) => onlyDigits(r.phone) === d) || null;
}

// Resolves whatever the GOM (or joiner) typed in a "Joiner" field — an @handle or a phone
// number — into { value: <canonical @handle to store>, match: <registry entry or null>, viaPhone }
export function resolveJoinerInput(registry, raw) {
  const trimmed = String(raw || '').trim();
  if (!trimmed) return { value: '', match: null, viaPhone: false };
  if (trimmed.includes('@')) {
    const h = normHandle(trimmed);
    return { value: h, match: findRegistryBySocial(registry, h), viaPhone: false };
  }
  const digits = onlyDigits(trimmed);
  if (digits.length >= 8) {
    const m = findRegistryByPhone(registry, digits);
    if (m) return { value: m.social, match: m, viaPhone: true };
    return { value: trimmed, match: null, viaPhone: true };
  }
  const h = normHandle(trimmed);
  return { value: h, match: findRegistryBySocial(registry, h), viaPhone: false };
}
