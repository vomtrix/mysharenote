import { beautifierConfig } from '@constants/beautifierConfig';
import { CHAIN_ID_TO_NAME } from '@constants/chainIcons';

export const beautify = (event: any) => {
  const map = beautifierConfig[event.kind];

  if (!map) {
    return event;
  }

  const result: any = {
    id: event.id,
    timestamp: event.created_at
  };
  const workerHashrates: Record<string, number> = {};
  const workerDetails: Record<
    string,
    {
      hashrate?: number;
      sharenote?: string | number;
      meanSharenote?: string | number;
      meanTime?: number;
      lastShareTimestamp?: number;
      userAgent?: string;
    }
  > = {};

  const auxBlocks: {
    chain?: string;
    height?: number;
    hash?: string;
    solved?: boolean;
  }[] = [];
  let parentBlock:
    | {
        chain?: string;
        height?: number;
        hash?: string;
        solved?: boolean;
      }
    | undefined;
  let hasProcessedParentChain = false;
  const mapChainIdentifierToName = (chain?: string) => {
    if (!chain) return undefined;
    const normalized = chain.trim().toLowerCase();
    if (!normalized) return undefined;
    const hexNormalized = normalized.startsWith('0x') ? normalized.slice(2) : normalized;
    const mappedChain =
      CHAIN_ID_TO_NAME[normalized] ?? CHAIN_ID_TO_NAME[hexNormalized] ?? normalized;
    return mappedChain;
  };

  event.tags.forEach((tagEntry: any) => {
    if (!Array.isArray(tagEntry) || tagEntry.length === 0) return;
    const [tagKey, ...rest] = tagEntry;

    if (event.kind === 35510 && tagKey === 'h') {
      if (rest.length >= 2) {
        const [hashRaw, chainOrHeightRaw, heightOrChainRaw, solvedRaw] = rest;
        const auxBlock: {
          chain?: string;
          height?: number;
          hash?: string;
          solved?: boolean;
        } = {};

        if (typeof hashRaw === 'string' && hashRaw.trim().length > 0) {
          auxBlock.hash = hashRaw.trim();
        }

        const potentialNewFormatHeight = Number(heightOrChainRaw);
        const potentialLegacyHeight = Number(chainOrHeightRaw);
        const hasNewFormatHeight = !Number.isNaN(potentialNewFormatHeight);
        if (hasNewFormatHeight) {
          auxBlock.height = potentialNewFormatHeight;
        } else if (!Number.isNaN(potentialLegacyHeight)) {
          auxBlock.height = potentialLegacyHeight;
        }

        const chainCandidate = hasNewFormatHeight ? chainOrHeightRaw : heightOrChainRaw;
        if (
          (typeof chainCandidate === 'string' || typeof chainCandidate === 'number') &&
          String(chainCandidate).trim().length > 0
        ) {
          const chainString = String(chainCandidate).trim();
          auxBlock.chain = mapChainIdentifierToName(chainString) ?? chainString;
        }

        if (typeof solvedRaw === 'string') {
          const normalizedSolved = solvedRaw.trim().toLowerCase();
          if (normalizedSolved === 'true') {
            auxBlock.solved = true;
          } else if (normalizedSolved === 'false') {
            auxBlock.solved = false;
          }
        }

        if (
          auxBlock.chain ||
          auxBlock.height !== undefined ||
          auxBlock.hash ||
          auxBlock.solved !== undefined
        ) {
          if (!hasProcessedParentChain) {
            hasProcessedParentChain = true;
            parentBlock = auxBlock;
            if (auxBlock.height !== undefined) {
              result.blockHeight = auxBlock.height;
            }
            if (auxBlock.solved !== undefined) {
              result.solved = auxBlock.solved;
            }
            return;
          }

          auxBlocks.push(auxBlock);

          if (result.blockHeight === undefined && auxBlock.height !== undefined) {
            result.blockHeight = auxBlock.height;
          }
          if (result.solved === undefined && auxBlock.solved !== undefined) {
            result.solved = auxBlock.solved;
          }
        }
      } else {
        const primaryValue = rest.find(
          (segment) => typeof segment === 'string' && segment !== '' && !segment.includes(':')
        );
        const auxBlock: {
          chain?: string;
          height?: number;
          hash?: string;
          solved?: boolean;
        } = {};
        if (primaryValue !== undefined) {
          const numericPrimary = Number(primaryValue);
          if (!Number.isNaN(numericPrimary)) {
            auxBlock.height = numericPrimary;
            result.blockHeight = numericPrimary;
          } else if (typeof primaryValue === 'string') {
            auxBlock.hash = primaryValue;
          }
        }
        const solvedFlag = rest.find((segment) => segment === 'true' || segment === 'false');
        if (solvedFlag === 'true') {
          auxBlock.solved = true;
          result.solved = true;
        } else if (solvedFlag === 'false') {
          auxBlock.solved = false;
          result.solved = false;
        }

        if (!hasProcessedParentChain) {
          hasProcessedParentChain = true;
          parentBlock = {
            ...parentBlock,
            ...auxBlock
          };
        } else if (
          auxBlock.chain ||
          auxBlock.height !== undefined ||
          auxBlock.hash ||
          auxBlock.solved !== undefined
        ) {
          auxBlocks.push(auxBlock);
        }
      }
      return;
    }

    if (
      event.kind === 35503 &&
      typeof tagKey === 'string' &&
      (tagKey === 'chain' || tagKey === 'chainid')
    ) {
      const primaryValue = rest.find(
        (segment) => typeof segment === 'string' && segment !== '' && !segment.includes(':')
      );
      if (primaryValue !== undefined) {
        const chainString = String(primaryValue).trim();
        if (chainString) {
          const mappedChain = mapChainIdentifierToName(chainString) ?? chainString;
          result.chainId = mappedChain;
        }
      }
      return;
    }

    if (event.kind === 35502 && typeof tagKey === 'string' && tagKey.startsWith('w:')) {
      const workerId = tagKey.slice(2);
      if (!workerId) return;

      if (!workerDetails[workerId]) workerDetails[workerId] = {};
      const detail = workerDetails[workerId];

      const hasKeyValueSegments = rest.some(
        (segment) => typeof segment === 'string' && segment.includes(':')
      );

      if (hasKeyValueSegments) {
        rest.forEach((segment) => {
          if (typeof segment !== 'string') return;
          const separatorIndex = segment.indexOf(':');
          if (separatorIndex === -1) return;
          const key = segment.slice(0, separatorIndex);
          const valueRaw = segment.slice(separatorIndex + 1);
          if (!key) return;

          switch (key) {
            case 'h': {
              const numericValue = Number(valueRaw);
              if (!Number.isNaN(numericValue)) {
                workerHashrates[workerId] = numericValue;
                detail.hashrate = numericValue;
              }
              break;
            }
            case 'sn': {
              if (valueRaw !== '') {
                const numericSharenote = Number(valueRaw);
                detail.sharenote = Number.isNaN(numericSharenote) ? valueRaw : numericSharenote;
              }
              break;
            }
            case 'msn': {
              if (valueRaw !== '') {
                const trimmedValue = valueRaw.trim();
                detail.meanSharenote = trimmedValue === '' ? undefined : trimmedValue;
              }
              break;
            }
            case 'mt': {
              const meanTimeValue = Number(valueRaw);
              if (!Number.isNaN(meanTimeValue)) {
                detail.meanTime = meanTimeValue;
              }
              break;
            }
            case 'lsn': {
              const lastShareTimestamp = Number(valueRaw);
              if (!Number.isNaN(lastShareTimestamp)) {
                detail.lastShareTimestamp = lastShareTimestamp;
              }
              break;
            }
            case 'ua': {
              if (valueRaw.trim().length > 0) {
                detail.userAgent = valueRaw.trim();
              }
              break;
            }
            default:
              break;
          }
        });
        return;
      }

      const [tagValue1, tagValue2, tagValue3, tagValue4, tagValue5, tagValue6] = rest;

      const numericValue = Number(tagValue1);
      const sharenoteRaw = tagValue2;
      const meanTimeValue = Number(tagValue3);
      const lastShareTimestamp = Number(tagValue4);
      const userAgentRaw = tagValue5;
      const meanSharenoteRaw = tagValue6;

      if (!Number.isNaN(numericValue)) {
        workerHashrates[workerId] = numericValue;
        detail.hashrate = numericValue;
      }
      if (sharenoteRaw !== undefined && sharenoteRaw !== null && sharenoteRaw !== '') {
        const numericSharenote = Number(sharenoteRaw);
        detail.sharenote = Number.isNaN(numericSharenote) ? String(sharenoteRaw) : numericSharenote;
      }
      if (meanSharenoteRaw !== undefined && meanSharenoteRaw !== null && meanSharenoteRaw !== '') {
        const trimmedMeanSn =
          typeof meanSharenoteRaw === 'string' ? meanSharenoteRaw.trim() : String(meanSharenoteRaw);
        detail.meanSharenote = trimmedMeanSn === '' ? undefined : trimmedMeanSn;
      }
      if (!Number.isNaN(meanTimeValue)) {
        detail.meanTime = meanTimeValue;
      }
      if (!Number.isNaN(lastShareTimestamp)) {
        detail.lastShareTimestamp = lastShareTimestamp;
      }
      if (typeof userAgentRaw === 'string' && userAgentRaw.trim().length > 0) {
        detail.userAgent = userAgentRaw.trim();
      }
      return;
    }

    const fieldKey = map[tagKey];
    if (fieldKey) {
      const primaryValue = rest.find(
        (segment) =>
          (typeof segment === 'string' && segment !== '' && !segment.includes(':')) ||
          typeof segment === 'number'
      );
      if (primaryValue !== undefined) {
        const numericPrimary = Number(primaryValue);
        result[fieldKey] = Number.isNaN(numericPrimary) ? primaryValue : numericPrimary;
      }

      if (fieldKey === 'shares' || fieldKey === 'totalShares') {
        const countValue = rest.slice(1).find(
          (segment) =>
            (typeof segment === 'string' && segment !== '' && !segment.includes(':')) ||
            typeof segment === 'number'
        );
        const numericCount = Number(countValue);
        if (Number.isFinite(numericCount)) {
          const countKey = fieldKey === 'shares' ? 'sharesCount' : 'totalSharesCount';
          result[countKey] = numericCount;
        }
      }

      rest.forEach((segment) => {
        if (typeof segment !== 'string') return;
        const separatorIndex = segment.indexOf(':');
        if (separatorIndex === -1) return;
        const key = segment.slice(0, separatorIndex);
        const valueRaw = segment.slice(separatorIndex + 1);
        if (!key) return;

        switch (key) {
          case 'msn': {
            if (valueRaw === '') break;
            const trimmed = valueRaw.trim();
            if (trimmed === '') break;
            const numericValue = Number(trimmed);
            result.meanSharenote = Number.isNaN(numericValue) ? trimmed : numericValue;
            break;
          }
          case 'mt': {
            const numericValue = Number(valueRaw);
            if (!Number.isNaN(numericValue)) {
              result.meanTime = numericValue;
            }
            break;
          }
          case 'lsn': {
            const numericValue = Number(valueRaw);
            if (!Number.isNaN(numericValue)) {
              result.lastShareTimestamp = numericValue;
            }
            break;
          }
          default:
            break;
        }
      });
    }

    if (event.kind === 35505 && tagKey === 'x') {
      const [txId, tagValue2, tagValue3] = rest;
      result.txId = txId;
      if (tagValue2 && tagValue3) {
        result.confirmedTx = true;
        result.txBlockHeight = tagValue2;
        result.txBlockHash = tagValue3;
      }
    }
  });

  if (event.kind === 35502) {
    if (Object.keys(workerHashrates).length > 0) {
      result.workers = workerHashrates;
    }
    const detailedWorkers = Object.entries(workerDetails).reduce(
      (acc, [workerId, detail]) => {
        if (
          detail.hashrate !== undefined ||
          detail.sharenote !== undefined ||
          detail.meanSharenote !== undefined ||
          detail.meanTime !== undefined ||
          detail.lastShareTimestamp !== undefined ||
          detail.userAgent !== undefined
        ) {
          acc[workerId] = detail;
        }
        return acc;
      },
      {} as Record<
        string,
        {
          hashrate?: number;
          sharenote?: string | number;
          meanSharenote?: string | number;
          meanTime?: number;
          lastShareTimestamp?: number;
          userAgent?: string;
        }
      >
    );
    if (Object.keys(detailedWorkers).length > 0) {
      result.workerDetails = detailedWorkers;
    }
  }

  if (event.kind === 35510) {
    const addressTag = event.tags.find(
      (tagEntry: any) => Array.isArray(tagEntry) && tagEntry.length > 2 && tagEntry[0] === 'a'
    );
    if (addressTag) {
      const [, addressValue, workerValue] = addressTag;
      if (addressValue) {
        result.address = addressValue;
      }
      if (workerValue) {
        result.worker = workerValue;
      }
    }

    if (auxBlocks.length > 0) {
      result.auxBlocks = auxBlocks;
    }
    if (parentBlock) {
      result.parentBlock = parentBlock;
      if (result.blockHeight === undefined && parentBlock.height !== undefined) {
        result.blockHeight = parentBlock.height;
      }
      if (result.solved === undefined && parentBlock.solved !== undefined) {
        result.solved = parentBlock.solved;
      }
    }
  }

  return result;
};
