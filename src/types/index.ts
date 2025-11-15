export interface DetectionRecord {
  Year: string;
  identified_by: string;
  class: string;
  order: string;
  family: string;
  genus: string;
  species: string;
  common_name: string;
  start_time: string;
  end_time: string;
  group_size: string;
  age: string;
  sex: string;
  Latitude: string;
  Longitude: string;
  Region: string;
  'Array Name': string;
  sequence_id: string;
  deployment_id: string;
}

export interface ProcessedDetection {
  year: number;
  commonName: string;
  startTime: Date;
  groupSize: number;
  latitude: number;
  longitude: number;
  hour: number;
  month: number;
  region: string;
  arrayName: string;
  sequenceId: string;
  deploymentId: string;
}

export interface SpeciesCount {
  species: string;
  count: number;
}

export interface HourlyActivity {
  hour: number;
  count: number;
}

export interface MonthlyActivity {
  month: number;
  monthName: string;
  count: number;
}
