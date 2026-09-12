import { useState } from 'react';

export type Period = 'Semana' | 'Mes';

const analytics = {
  Semana: [
    { label: 'Lun', value: 8 },
    { label: 'Mar', value: 12 },
    { label: 'Mié', value: 6 },
    { label: 'Jue', value: 15 },
    { label: 'Vie', value: 10 },
    { label: 'Sáb', value: 7 },
    { label: 'Dom', value: 5 },
  ],
  Mes: [
    { label: 'Sem 1', value: 25 },
    { label: 'Sem 2', value: 38 },
    { label: 'Sem 3', value: 31 },
    { label: 'Sem 4', value: 45 },
  ],
};

const categoryStats = [
  { label: 'Ayuda', icon: '🤝', value: 78 },
  { label: 'Empleo', icon: '💼', value: 62 },
  { label: 'Donaciones', icon: '🎁', value: 55 },
  { label: 'Reportes', icon: '📢', value: 41 },
];

export function useHomeViewModel() {
  const [period, setPeriod] = useState<Period>('Semana');

  return {
    period,
    setPeriod,
    data: analytics[period],
    categories: categoryStats,
  };
}
