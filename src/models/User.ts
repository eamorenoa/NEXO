export type UserRole = 'citizen' | 'communityAdmin' | 'institution';
export type User = { id: string; name: string; email: string; role?: UserRole };
