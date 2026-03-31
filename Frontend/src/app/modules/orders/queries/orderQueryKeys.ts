export const orderQueryKeys = {
    all: ['orders'] as const,
    company: (companyId: string) => ['orders', companyId] as const,
    kitchen: (companyId: string) => ['orders', companyId, 'kitchen'] as const,
};
