import { beautifierConfig } from '@constants/beautifierConfig';

export const beautify = (event: any) => {
  const map = beautifierConfig[event.kind];

  if (!map) {
    return event;
  }

  const result: any = {
    id: event.id,
    timestamp: event.created_at
  };

  event.tags.forEach(([tagKey, tagValue1, tagValue2, tagValue3]: any) => {
    const fieldKey = map[tagKey];
    if (fieldKey) {
      result[fieldKey] = isNaN(Number(tagValue1)) ? tagValue1 : Number(tagValue1);
    }

    if (event.kind === 35505 && tagKey == 'x') {
      result.txId = tagValue1;
      if (tagValue2 && tagValue3) {
        result.confirmedTx = true;
        result.txBlockHeight = tagValue2;
        result.txBlockHash = tagValue3;
        result.confirmedTx = true;
      }
    }
  });

  return result;
};
