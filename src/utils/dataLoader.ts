import Papa from 'papaparse';
import { DetectionRecord, ProcessedDetection } from '../types';

export const loadDetectionData = async (): Promise<ProcessedDetection[]> => {
  const response = await fetch(`${import.meta.env.BASE_URL}All Michigan Mammal Monitoring Detections 15July2025_Data Release.csv`);
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
                month: startTime.getMonth(),
                region: row.Region || '',
                arrayName: row['Array Name'] || '',
                sequenceId: row.sequence_id || '',
                deploymentId: row.deployment_id || ''
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

export const getUniqueRegions = (data: ProcessedDetection[]): string[] => {
  const regions = new Set(data.map(d => d.region).filter(r => r));
  return Array.from(regions).sort();
};

export const getUniqueArrayNames = (data: ProcessedDetection[]): string[] => {
  const arrayNames = new Set(data.map(d => d.arrayName).filter(a => a));
  return Array.from(arrayNames).sort();
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

export const getSpeciesDetectionCounts = (data: ProcessedDetection[]) => {
  const camerasBySpecies = new Map<string, Set<string>>();
  data.forEach(d => {
    if (!camerasBySpecies.has(d.commonName)) {
      camerasBySpecies.set(d.commonName, new Set());
    }
    const locationKey = `${d.latitude},${d.longitude}`;
    camerasBySpecies.get(d.commonName)!.add(locationKey);
  });
  return Array.from(camerasBySpecies.entries())
    .map(([species, cameras]) => ({ species, count: cameras.size }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 15); // Top 15 species
};

export const getSpeciesFrequency = (data: ProcessedDetection[]) => {
  const counts = new Map<string, number>();
  data.forEach(d => {
    counts.set(d.commonName, (counts.get(d.commonName) || 0) + d.groupSize);
  });
  return Array.from(counts.entries())
    .map(([species, count]) => ({ species, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 15); // Top 15 species
};

export const getArraySpeciesTable = (data: ProcessedDetection[]) => {
  const speciesMap = new Map<string, { totalGroupSize: number, cameras: Set<string> }>();
  const allCameras = new Set<string>();
  
  data.forEach(d => {
    const locationKey = `${d.latitude},${d.longitude}`;
    allCameras.add(locationKey);
    const existing = speciesMap.get(d.commonName);
    
    if (existing) {
      existing.totalGroupSize += d.groupSize;
      existing.cameras.add(locationKey);
    } else {
      speciesMap.set(d.commonName, {
        totalGroupSize: d.groupSize,
        cameras: new Set([locationKey])
      });
    }
  });
  
  const totalCameras = allCameras.size;
  
  return Array.from(speciesMap.entries())
    .map(([species, data]) => ({
      species,
      totalGroupSize: data.totalGroupSize,
      distinctCameras: data.cameras.size,
      totalCameras,
      proportion: totalCameras > 0 ? (data.cameras.size / totalCameras * 100).toFixed(1) : '0.0'
    }))
    .sort((a, b) => b.totalGroupSize - a.totalGroupSize);
};
