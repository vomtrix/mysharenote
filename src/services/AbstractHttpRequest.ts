import { RELAY_URL } from 'src/config/config';
import { RequestSecurityType, RequestVerbType } from '../objects/Enums';
import { HttpClient } from './HttpClient';

export class AbstractHttpRequest {
  private readonly httpClient: HttpClient;

  constructor() {
    this.httpClient = new HttpClient(RELAY_URL);
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
