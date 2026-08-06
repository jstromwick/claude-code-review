export function matchesAny(patterns: string[], filePath: string): boolean {
  return patterns.some((pattern) => globToRegExp(pattern).test(filePath));
}

function globToRegExp(pattern: string): RegExp {
  const segments = pattern.split('**');
  const escaped = segments
    .map((segment) =>
      segment
        .replace(/[.+^${}()|[\]\\]/g, '\\$&')
        .replace(/\*/g, '[^/]*')
        .replace(/\?/g, '.')
    )
    .join('.*');
  return new RegExp(`^${escaped}$`);
}
