export function phpUnserialize(serialized: string): any {
  if (!serialized || typeof serialized !== 'string') {
    return {};
  }

  try {
    let index = 0;
    const len = serialized.length;

    const skipWhitespace = () => {
      while (index < len && /\s/.test(serialized[index])) {
        index++;
      }
    };

    const readString = (): string => {
    if (index >= len || serialized[index] !== 's') {
      throw new Error('Expected string type');
    }
    index++;
    if (index >= len || serialized[index] !== ':') {
      throw new Error('Expected colon after string type');
    }
    index++;

    let lengthStr = '';
    while (index < len && /\d/.test(serialized[index])) {
      lengthStr += serialized[index];
      index++;
    }

    if (index >= len || serialized[index] !== ':') {
      throw new Error('Expected colon after string length');
    }
    index++;

    if (index >= len || serialized[index] !== '"') {
      throw new Error('Expected quote after colon');
    }
    index++;

    const length = parseInt(lengthStr, 10);
    if (isNaN(length) || length < 0) {
      throw new Error('Invalid string length');
    }

    if (index + length > len) {
      throw new Error('String length exceeds remaining data');
    }

    const value = serialized.substring(index, index + length);
    index += length;

    if (index >= len || serialized[index] !== '"') {
      throw new Error('Expected closing quote');
    }
    index++;

    if (index < len && serialized[index] === ';') {
      index++;
    }

      return value;
    };

    const readValue = (): any => {
    skipWhitespace();
    const type = serialized[index];

    if (type === 'a') {
      return readArray();
    } else if (type === 's') {
      return readString();
    } else if (type === 'i') {
      return readInteger();
    } else if (type === 'b') {
      return readBoolean();
    } else if (type === 'N') {
      return readNull();
    } else {
      throw new Error(`Unsupported type: ${type}`);
    }
    };

    const readInteger = (): number => {
    if (index >= len || serialized[index] !== 'i') {
      throw new Error('Expected integer type');
    }
    index++;
    if (index >= len || serialized[index] !== ':') {
      throw new Error('Expected colon after integer type');
    }
    index++;

    let numStr = '';
    while (index < len && /[\d-]/.test(serialized[index])) {
      numStr += serialized[index];
      index++;
    }

    if (index < len && serialized[index] === ';') {
      index++;
    }

      return parseInt(numStr, 10);
    };

    const readBoolean = (): boolean => {
    if (index >= len || serialized[index] !== 'b') {
      throw new Error('Expected boolean type');
    }
    index++;
    if (index >= len || serialized[index] !== ':') {
      throw new Error('Expected colon after boolean type');
    }
    index++;

    if (index >= len) {
      throw new Error('Unexpected end of data');
    }

    const value = serialized[index] === '1';
    index++;

    if (index < len && serialized[index] === ';') {
      index++;
    }

      return value;
    };

    const readNull = (): null => {
    if (index >= len || serialized[index] !== 'N') {
      throw new Error('Expected null type');
    }
    index++;
    if (index < len && serialized[index] === ';') {
      index++;
    }
      return null;
    };

    const readArray = (): Record<string, any> => {
    if (index >= len || serialized[index] !== 'a') {
      throw new Error('Expected array type');
    }
    index++;
    if (index >= len || serialized[index] !== ':') {
      throw new Error('Expected colon after array type');
    }
    index++;

    let countStr = '';
    while (index < len && /\d/.test(serialized[index])) {
      countStr += serialized[index];
      index++;
    }

    if (index >= len || serialized[index] !== ':') {
      throw new Error('Expected colon after array count');
    }
    index++;

    if (index >= len || serialized[index] !== '{') {
      throw new Error('Expected opening brace');
    }
    index++;

    const result: Record<string, any> = {};
    const count = parseInt(countStr, 10);

    if (isNaN(count) || count < 0) {
      throw new Error('Invalid array count');
    }

    for (let i = 0; i < count; i++) {
      skipWhitespace();
      if (index >= len) {
        throw new Error('Unexpected end of data while reading array');
      }
      const key = readValue();
      skipWhitespace();
      if (index >= len) {
        throw new Error('Unexpected end of data while reading array value');
      }
      const value = readValue();
      result[key] = value;
    }

    skipWhitespace();
    if (index >= len || serialized[index] !== '}') {
      throw new Error('Expected closing brace');
    }
    index++;

      return result;
    };

    skipWhitespace();
    return readValue();
  } catch (error) {
    console.error('PHP unserialize error:', error);
    return {};
  }
}
