// Example external service integration
export class ExternalApiService {
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars, @typescript-eslint/require-await, @typescript-eslint/no-explicit-any
  async fetchData(endpoint: string): Promise<any> {
    // External API call logic here
    return null;
  }
}
