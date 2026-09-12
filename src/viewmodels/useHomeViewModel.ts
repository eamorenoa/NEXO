import { analytics, categoryStats, Period } from '../features/analytics'; import { useState } from 'react';
export function useHomeViewModel(){const [period,setPeriod]=useState<Period>('Semana');return{period,setPeriod,data:analytics[period],categories:categoryStats};}
