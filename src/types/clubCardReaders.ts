export type CardReaderOption = {
  id: string;
  name: string;
};

export type CardReaderListItem = {
  id: string;
  description: string;
  readerName: string;
  readerType: string;
  controlMode: string;
  controlModeId: number;
  readerPort: string;
  enabled: boolean;
  activities: { id: string; label: string }[];
  services: { id: string; label: string }[];
};
