import { describe, expect, it } from 'vitest';
import { describeAccept } from './accept.js';

describe('describeAccept', () => {
  it.each([
    ['.csv', 'CSV'],
    ['.csv,.json', 'CSV or JSON'],
    ['.csv,.json,application/json', 'CSV or JSON'],
    ['.csv, .json , text/csv', 'CSV or JSON'],
    ['.pdf,.png,.jpg', 'PDF, PNG, or JPG'],
    ['.CSV,.csv', 'CSV'],
    ['image/png', 'PNG'],
    ['image/svg+xml', 'SVG'],
    ['text/plain', 'TXT'],
    ['application/x-ndjson', 'NDJSON'],
    ['image/*', 'images'],
    ['image/*,video/*', 'images or videos'],
    ['audio/*', 'audio'],
    ['text/*', 'text files'],
    [
      '.csv,.json,.xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'CSV, JSON, or XLSX',
    ],
    ['application/vnd.ms-excel', 'XLS'],
    ['application/msword', 'DOC'],
    ['application/vnd.oasis.opendocument.text', 'ODT'],
    ['application/vnd.unknown-thing', 'application/vnd.unknown-thing'],
    ['.yml,.jpeg,.htm,.tif', 'YAML, JPG, HTML, or TIFF'],
    ['.yaml,.yml,application/x-yaml', 'YAML'],
    ['audio/mpeg', 'MP3'],
    ['video/mpeg', 'MPEG'],
    ['application/ld+json', 'JSON-LD'],
    ['.csv,.json,.ndjson,.jsonl,.yaml,.yml,.xlsx', 'CSV, JSON, NDJSON, JSONL, YAML, or XLSX'],
    ['.json,.yaml,.yml,application/json,application/yaml', 'JSON or YAML'],
    ['.png,.jpg,.jpeg,.webp', 'PNG, JPG, or WEBP'],
    ['', ''],
    [' , ', ''],
  ])('describes %j as %j', (accept, expected) => {
    expect(describeAccept(accept)).toBe(expected);
  });
});
