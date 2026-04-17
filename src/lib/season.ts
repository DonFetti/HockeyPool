/** NHL season id is eight digits: startYear concatenated with endYear (e.g. 20252026). */
export function seasonIdFromDate(d = new Date()): number {
  const y = d.getUTCFullYear();
  const m = d.getUTCMonth() + 1;
  const startYear = m >= 10 ? y : y - 1;
  return startYear * 10000 + (startYear + 1);
}
