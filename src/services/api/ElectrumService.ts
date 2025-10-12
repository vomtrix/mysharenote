import { Service } from 'typedi';
import { RequestSecurityType, RequestVerbType } from '@objects/Enums';
import { AbstractHttpRequest } from '@services/AbstractHttpRequest';
import { ELECTRUM_API_URL } from 'src/config/config';

@Service()
export class ElectrumService extends AbstractHttpRequest {
  constructor() {
    super(ELECTRUM_API_URL);
  }

  async getBlock(blockHash: string) {
    const response = await this.makeRequest(
      `/block/${blockHash}`,
      undefined,
      undefined,
      RequestSecurityType.Public,
      RequestVerbType.Get
    );

    return response;
  }
}
