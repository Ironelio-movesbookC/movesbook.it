export type CardReaderAddForm = {
  description: string;
  numOrder: string;
  readerTypeId: string;
  ipLocal: string;
  ip: string;
  enabled: boolean;
  controlModeId: string;
  idCards: string;
};

export function linkedIdCardsForType(typeName: string, typeId: string): string {
  const key = typeName.toLowerCase().replace(/\s+/g, '');
  if (key.includes('magnetic') || typeId === '1') return 'MAGNETIC';
  if (key.includes('qr')) return 'QR CODE';
  if (key.includes('smart')) return 'SMART';
  return 'RFID';
}

export function instructionForType(typeId: string): string | null {
  if (['1', '3', '5'].includes(typeId)) {
    return 'Connect the reader to the relay card and the card to the ethernet port of PC';
  }
  if (['2', '4', '6'].includes(typeId)) {
    return 'Connect the reader to the relay card and the card to a free port of your router';
  }
  if (typeId) {
    return 'Connect the Rfid reader on a free port of your router/modem';
  }
  return null;
}

export function initialCardReaderForm(): CardReaderAddForm {
  return {
    description: '',
    numOrder: '',
    readerTypeId: '',
    ipLocal: '',
    ip: '',
    enabled: true,
    controlModeId: '',
    idCards: '',
  };
}
