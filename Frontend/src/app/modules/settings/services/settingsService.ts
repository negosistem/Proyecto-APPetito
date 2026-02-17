import { apiClient } from '@/app/shared/services/apiClient';

export interface CompanySettings {
  tax_rate: number;
  currency: string;
  invoice_prefix: string;
}

export interface CompanySettingsUpdate {
  tax_rate?: number;
  currency?: string;
  invoice_prefix?: string;
}

export const settingsService = {
  async getCompanySettings(): Promise<CompanySettings> {
    return apiClient.get<CompanySettings>('/api/settings/company');
  },

  async updateCompanySettings(data: CompanySettingsUpdate): Promise<CompanySettings> {
    return apiClient.patch<CompanySettings>('/api/settings/company', data);
  }
};
