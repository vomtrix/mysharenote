import { RequestSecurityType, RequestVerbType } from '../objects/Enums';
import { HttpClient } from './HttpClient';

export class AbstractHttpRequest {
  private readonly httpClient: HttpClient;

  constructor(baseUrl: string) {
    this.httpClient = new HttpClient(baseUrl);
  }

  async makeRequest(
    resource: string,
    data: any = {},
    params: any = {},
    security?: RequestSecurityType,
    verb?: RequestVerbType
  ) {
    return this.httpClient.request(resource, params, verb, data);
  }
}
