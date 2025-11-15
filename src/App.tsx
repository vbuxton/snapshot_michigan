import { useState, useEffect, useRef } from 'react';
import { ProcessedDetection } from './types';
import { 
  loadDetectionData, 
  getUniqueSpecies,
  getUniqueRegions,
  getUniqueArrayNames,
  getHourlyActivity,
  getMonthlyActivity,
  exportToCSV
} from './utils/dataLoader';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer
} from 'recharts';
import { MapView } from './components/MapView';
import Slider from 'rc-slider';
import html2canvas from 'html2canvas';
import 'rc-slider/assets/index.css';
import './App.css';

function App() {
  const [allData, setAllData] = useState<ProcessedDetection[]>([]);
  const [filteredData, setFilteredData] = useState<ProcessedDetection[]>([]);
  const [species, setSpecies] = useState<string[]>([]);
  const [selectedSpecies, setSelectedSpecies] = useState<string[]>(['All']);
  const [speciesSearch, setSpeciesSearch] = useState<string>('');
  const [regions, setRegions] = useState<string[]>([]);
  const [selectedRegions, setSelectedRegions] = useState<string[]>(['All']);
  const [arrayNames, setArrayNames] = useState<string[]>([]);
  const [selectedArrayNames, setSelectedArrayNames] = useState<string[]>(['All']);
  const [dateRange, setDateRange] = useState<[number, number]>([0, 101]); // Jan 2017 to Jun 2025
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [activityView, setActivityView] = useState<'hour' | 'month'>('hour');
  
  const chartRef = useRef<HTMLDivElement>(null);

  const minDate = 0; // January 2017
  const maxDate = 101; // June 2025 (8 years * 12 + 6 months = 102 months, indexed 0-101)
  
  // Generate date labels from Jan 2017 to Jun 2025
  const dateLabels: string[] = [];
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  for (let year = 2017; year <= 2024; year++) {
    for (let month = 0; month < 12; month++) {
      dateLabels.push(`${months[month]} ${year}`);
    }
  }
  // Add first 6 months of 2025
  for (let month = 0; month < 6; month++) {
    dateLabels.push(`${months[month]} 2025`);
  }

  useEffect(() => {
    loadDetectionData()
      .then(data => {
        setAllData(data);
        const uniqueSpecies = getUniqueSpecies(data);
        setSpecies(['All', ...uniqueSpecies]);
        const uniqueRegions = getUniqueRegions(data);
        setRegions(['All', ...uniqueRegions]);
        const uniqueArrayNames = getUniqueArrayNames(data);
        setArrayNames(['All', ...uniqueArrayNames]);
        setLoading(false);
      })
      .catch(err => {
        setError('Failed to load data: ' + err.message);
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    let data = allData;
    // Filter by species (handle multiple selections)
    if (selectedSpecies.length > 0 && !selectedSpecies.includes('All')) {
      data = data.filter(d => selectedSpecies.includes(d.commonName));
    }
    // Filter by region
    if (selectedRegions.length > 0 && !selectedRegions.includes('All')) {
      data = data.filter(d => selectedRegions.includes(d.region));
    }
    // Filter by array name
    if (selectedArrayNames.length > 0 && !selectedArrayNames.includes('All')) {
      data = data.filter(d => selectedArrayNames.includes(d.arrayName));
    }
    // Filter by month range (0-101 = Jan 2017 to Jun 2025)
    data = data.filter(d => {
      if (!d.startTime) return false;
      const date = new Date(d.startTime);
      if (isNaN(date.getTime())) return false; // Invalid date
      const year = date.getFullYear();
      const month = date.getMonth(); // 0-11
      const monthIndex = (year - 2017) * 12 + month; // Convert to 0-101 range
      return monthIndex >= dateRange[0] && monthIndex <= dateRange[1];
    });
    setFilteredData(data);
  }, [allData, selectedSpecies, selectedRegions, selectedArrayNames, dateRange]);

  const hourlyData = getHourlyActivity(filteredData);
  const monthlyData = getMonthlyActivity(filteredData);

  // Prepare data for smooth line charts with proper labels
  const chartData = activityView === 'hour'
    ? hourlyData.map(d => ({
        label: `${d.hour}:00`,
        hour: d.hour,
        count: d.count
      }))
    : monthlyData.map(d => ({
        label: d.monthName,
        month: d.month,
        count: d.count
      }));

  const handleDownload = () => {
    const filename = `Michigan_Mammal_${selectedSpecies.join('_').replace(/\s+/g, '_')}_${dateLabels[dateRange[0]]}-${dateLabels[dateRange[1]]}.csv`.replace(/\s+/g, '_');
    exportToCSV(filteredData, filename);
  };

  const handleDownloadChart = async () => {
    if (!chartRef.current) return;
    
    try {
      const canvas = await html2canvas(chartRef.current, {
        backgroundColor: '#ffffff',
        scale: 2,
      });
      
      const link = document.createElement('a');
      const filename = `Michigan_Mammal_Activity_${activityView}_${selectedSpecies.join('_').replace(/\s+/g, '_')}_${dateLabels[dateRange[0]]}-${dateLabels[dateRange[1]]}.png`.replace(/\s+/g, '_');
      link.download = filename;
      link.href = canvas.toDataURL('image/png');
      link.click();
    } catch (error) {
      console.error('Error downloading chart:', error);
      alert('Failed to download chart');
    }
  };

  // Get unique locations for map (only show points with detections)
  const locations = filteredData
    .filter(d => d.latitude && d.longitude)
    .reduce((acc, d) => {
      const key = `${d.latitude},${d.longitude}`;
      if (!acc.has(key)) {
        acc.set(key, { lat: d.latitude, lng: d.longitude, count: 0 });
      }
      acc.get(key)!.count++;
      return acc;
    }, new Map());

  const mapPoints = Array.from(locations.values());

  if (loading) {
    return (
      <div className="app">
        <header className="app-header">
          <div className="header-content">
            <h1>Michigan Mammal Monitoring Project</h1>
            <p>Wildlife Camera Trap Detection Dashboard</p>
          </div>
        </header>
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Loading detection data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="app">
        <header className="app-header">
          <div className="header-content">
            <h1>Michigan Mammal Monitoring Project</h1>
            <p>Wildlife Camera Trap Detection Dashboard</p>
          </div>
        </header>
        <div className="error-container">
          <p>{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="app">
      <header className="app-header">
        <div className="header-content">
          <h1>Michigan Mammal Monitoring Project</h1>
        </div>
      </header>

      {/* Description and Logos Section */}
      <div className="info-section">
        <div className="info-content">
          <img src={`${import.meta.env.BASE_URL}cooperative-logo.png`} alt="Cooperative Unit Logo" className="info-logo info-logo-left" />
          <p className="project-description">
            The Michigan Mammal Monitoring Project is a camera trapping effort with the goal of collecting and compiling extensive, repeated baseline data regarding the distribution and relative abundance of mammals across the state. These data are collected throughout the year in widely disparate locations and habitats. These data are collected across land ownership including DNR State Game Areas and State Parks, U.S. Fish and Wildlife Refuges, MSU research stations, Military Installations, and National Forests.
          </p>
          <img src={`${import.meta.env.BASE_URL}msu-logo.png`} alt="MSU Logo" className="info-logo info-logo-right" />
        </div>
      </div>

      {/* Summary Cards */}
      <div className="summary-cards">
        <div className="summary-card">
          <div className="summary-card-icon">📊</div>
          <div className="summary-card-label">Total Detections</div>
          <div className="summary-card-value">{filteredData.reduce((sum, d) => sum + (d.groupSize || 1), 0).toLocaleString()}</div>
        </div>
        <div className="summary-card">
          <div className="summary-card-icon">🦌</div>
          <div className="summary-card-label">Species Selected</div>
          <div className="summary-card-value">{selectedSpecies.join(', ')}</div>
        </div>
        <div className="summary-card">
          <div className="summary-card-icon">📅</div>
          <div className="summary-card-label">Date Range</div>
          <div className="summary-card-value">{dateLabels[dateRange[0]]} - {dateLabels[dateRange[1]]}</div>
        </div>
        <div className="summary-card">
          <div className="summary-card-icon">📷</div>
          <div className="summary-card-label">Camera Locations</div>
          <div className="summary-card-value">{mapPoints.length}</div>
        </div>
      </div>

      <div className="main-container">
        {/* Sidebar */}
        <aside className="sidebar">
          <div className="sidebar-panel">
            <h2 className="sidebar-title">Filters</h2>
            
            <div className="filter-section">
              <label className="filter-label" htmlFor="species-search">
                Species of Interest
              </label>
              <input
                id="species-search"
                type="text"
                className="species-search-input"
                placeholder="Search species..."
                value={speciesSearch}
                onChange={(e) => setSpeciesSearch(e.target.value)}
              />
              <div className="species-select-container">
                <select
                  id="species-select"
                  className="filter-select species-multiselect"
                  multiple
                  size={10}
                  value={selectedSpecies}
                  onChange={(e) => {
                    const options = Array.from(e.target.selectedOptions, option => option.value);
                    setSelectedSpecies(options.length > 0 ? options : ['All']);
                  }}
                >
                  {species
                    .filter(sp => sp.toLowerCase().includes(speciesSearch.toLowerCase()))
                    .map((sp) => (
                      <option key={sp} value={sp}>
                        {sp}
                      </option>
                    ))}
                </select>
              </div>
              <button 
                className="clear-species-btn"
                onClick={() => {
                  setSelectedSpecies(['All']);
                  setSpeciesSearch('');
                }}
              >
                Clear Selection
              </button>
              <p className="filter-hint">Hold Ctrl/Cmd to select multiple</p>
            </div>

            <div className="filter-section">
              <label className="filter-label" htmlFor="region-select">
                Region
              </label>
              <div className="species-select-container">
                <select
                  id="region-select"
                  className="filter-select species-multiselect"
                  multiple
                  size={6}
                  value={selectedRegions}
                  onChange={(e) => {
                    const options = Array.from(e.target.selectedOptions, option => option.value);
                    setSelectedRegions(options.length > 0 ? options : ['All']);
                  }}
                >
                  {regions.map((region) => (
                    <option key={region} value={region}>
                      {region}
                    </option>
                  ))}
                </select>
              </div>
              <button 
                className="clear-species-btn"
                onClick={() => setSelectedRegions(['All'])}
              >
                Clear Selection
              </button>
              <p className="filter-hint">Hold Ctrl/Cmd to select multiple</p>
            </div>

            <div className="filter-section">
              <label className="filter-label" htmlFor="array-select">
                Array Name
              </label>
              <div className="species-select-container">
                <select
                  id="array-select"
                  className="filter-select species-multiselect"
                  multiple
                  size={6}
                  value={selectedArrayNames}
                  onChange={(e) => {
                    const options = Array.from(e.target.selectedOptions, option => option.value);
                    setSelectedArrayNames(options.length > 0 ? options : ['All']);
                  }}
                >
                  {arrayNames.map((arrayName) => (
                    <option key={arrayName} value={arrayName}>
                      {arrayName}
                    </option>
                  ))}
                </select>
              </div>
              <button 
                className="clear-species-btn"
                onClick={() => setSelectedArrayNames(['All'])}
              >
                Clear Selection
              </button>
              <p className="filter-hint">Hold Ctrl/Cmd to select multiple</p>
            </div>

            <div className="filter-section">
              <label className="filter-label">
                Date Range
              </label>
              <div className="date-range-display">
                {dateLabels[dateRange[0]]} - {dateLabels[dateRange[1]]}
              </div>
              <Slider
                range
                min={minDate}
                max={maxDate}
                value={dateRange}
                onChange={(value) => setDateRange(value as [number, number])}
                marks={{
                  0: '2017',
                  24: '2019',
                  48: '2021',
                  72: '2023',
                  96: '2025'
                }}
              />
            </div>

            <div className="filter-section">
              <button onClick={handleDownload} className="download-btn">
                <span className="download-icon">⬇</span>
                Download Dataset
              </button>
            </div>

            <div className="links-section">
              <h3 className="links-title">Links</h3>
              <ul className="links-list">
                <li>
                  <a href="https://www.snapshot-usa.org/" target="_blank" rel="noopener noreferrer">
                    For data beyond Michigan, click to visit Snapshot USA
                  </a>
                </li>
                <li>
                  <a href="https://degregoriolab.weebly.com/michigan-mammal-monitoring-project.html" target="_blank" rel="noopener noreferrer">
                    For more about the Michigan Mammal Monitoring Project, click to visit the DeGregorio Lab website
                  </a>
                </li>
                <li>
                  <a href="https://flickr.com/photos/194358526@N08/" target="_blank" rel="noopener noreferrer">
                    For selected photos from the project, click to visit our Flickr account
                  </a>
                </li>
              </ul>
            </div>
          </div>
        </aside>

        {/* Main Content */}
        <main className="content">
          {/* Detection Map */}
          <section className="dashboard-section">
            <div className="section-header">
              <h2 className="section-title">📍 Detection Map</h2>
            </div>
            <div className="detection-map-container">
              <MapView points={mapPoints} selectedSpecies={selectedSpecies.join(', ')} />
            </div>
          </section>

          {/* Animal Activity */}
          <section className="dashboard-section">
            <div className="section-header">
              <h2 className="section-title">📊 Animal Activity</h2>
              <div className="header-actions">
                <div className="activity-toggle">
                  <button
                    className={`toggle-btn ${activityView === 'hour' ? 'active' : ''}`}
                    onClick={() => setActivityView('hour')}
                  >
                    by Hour
                  </button>
                  <button
                    className={`toggle-btn ${activityView === 'month' ? 'active' : ''}`}
                    onClick={() => setActivityView('month')}
                  >
                    by Month
                  </button>
                </div>
                <button onClick={handleDownloadChart} className="download-chart-btn">
                  ⬇ Download Chart
                </button>
              </div>
            </div>

            <div className="chart-container" ref={chartRef}>
              <ResponsiveContainer width="100%" height={400}>
                <LineChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                  <XAxis 
                    dataKey="label" 
                    stroke="#666"
                    style={{ fontSize: '12px' }}
                  />
                  <YAxis 
                    stroke="#666"
                    style={{ fontSize: '12px' }}
                    label={{ value: 'Detections', angle: -90, position: 'insideLeft' }}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      background: 'white', 
                      border: '2px solid #4A90E2',
                      borderRadius: '8px'
                    }}
                  />
                  <Legend />
                  <Line 
                    type="monotone" 
                    dataKey="count" 
                    stroke="#4A90E2" 
                    strokeWidth={3}
                    dot={{ fill: '#357ABD', r: 4 }}
                    activeDot={{ r: 6 }}
                    name="Detections"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>

            <div className="chart-description">
              <p>
                {activityView === 'hour' 
                  ? 'This chart shows detection patterns throughout the day. Each point represents the total number of detections during that hour across all selected dates.'
                  : 'This chart shows detection patterns throughout the year. Each point represents the total number of detections during that month across all selected years.'
                }
              </p>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}

export default App;
