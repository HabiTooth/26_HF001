// 숫자만 받아 YYYY-MM-DD로 변환
export function formatBirthDate(input: string): string {
  const digits = input.replace(/\D/g, '').slice(0, 8);
  if (digits.length <= 4) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 4)}-${digits.slice(4)}`;
  return `${digits.slice(0, 4)}-${digits.slice(4, 6)}-${digits.slice(6)}`;
}

const ISO = /^\d{4}-\d{2}-\d{2}$/;

// 달력 input은 완성된 날짜만
export const asIsoDate = (value: string) => (ISO.test(value) ? value : '');

export const todayIso = () => new Date().toISOString().slice(0, 10);
