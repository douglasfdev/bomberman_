export function isMainModule(): boolean {
  return typeof require !== 'undefined' && require.main === module;
}
