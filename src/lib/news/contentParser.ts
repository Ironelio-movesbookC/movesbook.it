import { phpUnserialize } from './phpUnserialize';

/**
 * Content parser utility for serializing/deserializing multi-language content
 * Format: base64_encode(serialize({en: "...", fr: "...", ...}))
 * 
 * Note: Old PHP version uses PHP serialize format, new version uses JSON
 */

/**
 * Serialize multi-language content to base64 encoded string
 */
export function serializeMultiLanguageContent(
  content: Record<string, string>
): string {
  try {
    const jsonString = JSON.stringify(content);
    const base64String = Buffer.from(jsonString, 'utf-8').toString('base64');
    return base64String;
  } catch (error) {
    console.error('Error serializing content:', error);
    throw new Error('Failed to serialize multi-language content');
  }
}

/**
 * Deserialize base64 encoded multi-language content
 * Handles both PHP serialize format (old) and JSON format (new)
 */
export function deserializeMultiLanguageContent(
  base64Content: string
): Record<string, string> {
  if (!base64Content || typeof base64Content !== 'string' || base64Content.trim().length === 0) {
    return {};
  }

  try {
    let decoded: string;
    try {
      decoded = Buffer.from(base64Content, 'base64').toString('utf-8');
    } catch (e) {
      console.error('Base64 decode error:', e);
      return {};
    }
    
    if (!decoded || decoded.length === 0) {
      console.warn('Decoded content is empty');
      return {};
    }

    if (decoded.startsWith('a:') || decoded.startsWith('O:') || decoded.startsWith('s:')) {
      try {
        const result = phpUnserialize(decoded);
        if (result && typeof result === 'object' && !Array.isArray(result)) {
          return result as Record<string, string>;
        }
        console.warn('PHP unserialize returned invalid result:', result);
        return {};
      } catch (phpError) {
        console.error('PHP unserialize error:', phpError);
        return {};
      }
    } else if (decoded.startsWith('{') || decoded.startsWith('[')) {
      try {
        const parsed = JSON.parse(decoded);
        return parsed;
      } catch (jsonError) {
        if (jsonError instanceof SyntaxError && decoded.startsWith('{')) {
          console.error('JSON parse error. Decoded length:', decoded.length, 'First 500 chars:', decoded.substring(0, 500), 'Last 200 chars:', decoded.substring(Math.max(0, decoded.length - 200)));
          
          try {
            const lastBraceIndex = decoded.lastIndexOf('}');
            if (lastBraceIndex > 0) {
              const truncated = decoded.substring(0, lastBraceIndex + 1);
              try {
                const parsed = JSON.parse(truncated);
                console.warn('Successfully parsed truncated JSON (removed incomplete ending)');
                return parsed;
              } catch {
                console.warn('Failed to parse even truncated JSON');
              }
            }
            
            const partialResult: Record<string, string> = {};
            let depth = 0;
            let inString = false;
            let escaped = false;
            let currentKey = '';
            let currentValue = '';
            let state: 'key' | 'value' = 'key';
            
            for (let i = 0; i < decoded.length; i++) {
              const char = decoded[i];
              
              if (escaped) {
                if (state === 'value') currentValue += char;
                escaped = false;
                continue;
              }
              
              if (char === '\\') {
                escaped = true;
                if (state === 'value') currentValue += char;
                continue;
              }
              
              if (char === '"') {
                inString = !inString;
                if (!inString && state === 'key' && currentKey) {
                  state = 'value';
                  currentValue = '';
                }
                continue;
              }
              
              if (inString) {
                if (state === 'key') {
                  currentKey += char;
                } else {
                  currentValue += char;
                }
                continue;
              }
              
              if (char === ':') {
                if (state === 'key' && currentKey) {
                  state = 'value';
                  currentValue = '';
                }
                continue;
              }
              
              if (char === ',' || char === '}') {
                if (state === 'value' && currentKey && currentValue) {
                  try {
                    let finalValue = JSON.parse(`"${currentValue}"`);
                    partialResult[currentKey] = finalValue;
                  } catch {
                    partialResult[currentKey] = currentValue.replace(/\\"/g, '"').replace(/\\n/g, '\n').replace(/\\r/g, '\r').replace(/\\\\/g, '\\');
                  }
                  currentKey = '';
                  currentValue = '';
                  state = 'key';
                }
                if (char === '}') break;
                continue;
              }
            }
            
            if (Object.keys(partialResult).length > 0) {
              console.warn('Using improved partial JSON extraction. Keys found:', Object.keys(partialResult), 'Total decoded length:', decoded.length);
              Object.keys(partialResult).forEach(key => {
                console.warn(`  Key "${key}" value length: ${partialResult[key].length}`);
              });
              return partialResult;
            }
          } catch (partialError) {
            console.error('Failed to extract partial JSON:', partialError);
          }
        }
        console.error('JSON parse error:', jsonError, 'Decoded length:', decoded.length);
        return {};
      }
    } else {
      console.warn('Unknown content format, starts with:', decoded.substring(0, 10));
      return {};
    }
  } catch (error) {
    console.error('Deserialize error:', error);
    return {};
  }
}

/**
 * Get content for a specific language
 */
export function getContentForLanguage(
  base64Content: string,
  language: string
): string {
  const content = deserializeMultiLanguageContent(base64Content);
  return content[language] || content['en'] || '';
}

/**
 * Update content for a specific language
 */
export function updateContentForLanguage(
  base64Content: string,
  language: string,
  newContent: string
): string {
  const content = deserializeMultiLanguageContent(base64Content);
  content[language] = newContent;
  return serializeMultiLanguageContent(content);
}
