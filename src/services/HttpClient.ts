import axios, { AxiosRequestConfig } from 'axios';
import CustomError from '../objects/CustomError';

export class HttpClient {
  private config: AxiosRequestConfig = {
    headers: {}
  };

  constructor(private readonly baseUrl?: string) {}

  setHeader(key: string, value: string) {
    this.config.headers = {
      ...this.config.headers,
      [key]: value
    };
  }

  getRequestPath(url: string) {
    return this.baseUrl ? `${this.baseUrl}/${url}` : url;
  }

  async request(url: string, params = {}, method = 'GET', data = null) {
    try {
      const config = {
        ...this.config,
        method,
        url: this.getRequestPath(url),
        params
      };

      if (method.toUpperCase() != 'GET' && data) config.data = data;

      const response = await axios(config);

      return response?.data;
    } catch (err: any) {
      throw new CustomError(err);
    }
  }
}
