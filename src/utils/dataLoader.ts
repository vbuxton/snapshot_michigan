import Papa from 'papaparse';
import { DetectionRecord, ProcessedDetection } from '../types';

export const loadDetectionData = async (): Promise<ProcessedDetection[]> => {
  const response = await fetch('/All Michigan Mammal Monitoring Detections 15July2025_Data Release.csv');
  const csvText = await response.text();
  
  return new Promise((resolve, reject) => {
    Papa.parse<DetectionRecord>(csvText, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        try {
          const processed = results.data
            .filter(row => row.common_name && row.common_name.trim() !== '' && row.common_name !== 'Blank')
            .map(row => {
              const startTime = new Date(row.start_time);
              return {
                year: parseInt(row.Year) || 0,
                commonName: row.common_name,
                startTime: startTime,
                groupSize: parseInt(row.group_size) || 1,
                latitude: parseFloat(row.Latitude) || 0,
                longitude: parseFloat(row.Longitude) || 0,
                hour: startTime.getHours(),
                month: startTime.getMonth()
              };
            })
            .filter(d => d.year > 0 && d.latitude !== 0 && d.longitude !== 0);
          
          resolve(processed);
        } catch (error) {
          reject(error);
        }
      },
      error: (error: Error) => reject(error)
    });
  });
};

export const getUniqueSpecies = (data: ProcessedDetection[]): string[] => {
  const species = new Set(data.map(d => d.commonName));
  return Array.from(species).sort();
};

export const filterBySpecies = (data: ProcessedDetection[], species: string): ProcessedDetection[] => {
  return data.filter(d => d.commonName === species);
};

export const filterByDateRange = (
  data: ProcessedDetection[], 
  startYear: number, 
  endYear: number
): ProcessedDetection[] => {
  return data.filter(d => d.year >= startYear && d.year <= endYear);
};

export const getHourlyActivity = (data: ProcessedDetection[]) => {
  const hourCounts = new Array(24).fill(0);
  data.forEach(d => {
    hourCounts[d.hour]++;
  });
  return hourCounts.map((count, hour) => ({ hour, count }));
};

export const getMonthlyActivity = (data: ProcessedDetection[]) => {
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const monthCounts = new Array(12).fill(0);
  data.forEach(d => {
    monthCounts[d.month]++;
  });
  return monthCounts.map((count, month) => ({ 
    month, 
    monthName: monthNames[month],
    count 
  }));
};

export const exportToCSV = (data: ProcessedDetection[], filename: string) => {
  const csv = Papa.unparse(data);
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};
