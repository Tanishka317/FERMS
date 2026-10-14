// Mock Analytics Data
// TODO: Replace with real database/API data

export const mockAnalytics = {
  summary: {
    totalIncidents: 47,
    totalResolved: 32,
    avgResponseTime: '7m 42s',
    avgResolutionTime: '2h 18m',
    unitUtilization: 74,
    criticalIncidents: 3,
  },

  incidentsPerDay: [
    { date: '25 Sep', incidents: 5 },
    { date: '26 Sep', incidents: 7 },
    { date: '27 Sep', incidents: 4 },
    { date: '28 Sep', incidents: 8 },
    { date: '29 Sep', incidents: 6 },
    { date: '30 Sep', incidents: 12 },
    { date: '01 Oct', incidents: 5 },
  ],

  incidentsBySeverity: [
    { severity: 'Critical', count: 8, color: '#dc2626' },
    { severity: 'High', count: 15, color: '#ea580c' },
    { severity: 'Medium', count: 16, color: '#d97706' },
    { severity: 'Low', count: 8, color: '#2563eb' },
  ],

  incidentsByRegion: [
    { region: 'Andheri', incidents: 9 },
    { region: 'Bandra', incidents: 7 },
    { region: 'Dadar', incidents: 6 },
    { region: 'Kurla', incidents: 5 },
    { region: 'Borivali', incidents: 4 },
    { region: 'Powai', incidents: 6 },
    { region: 'Malad', incidents: 5 },
    { region: 'Others', incidents: 5 },
  ],

  avgResponseTimeByRegion: [
    { region: 'Andheri', time: 6.5 },
    { region: 'Bandra', time: 8.2 },
    { region: 'Dadar', time: 7.1 },
    { region: 'Kurla', time: 9.4 },
    { region: 'Borivali', time: 7.8 },
    { region: 'Powai', time: 11.2 },
    { region: 'Malad', time: 9.0 },
  ],

  unitUtilization: [
    { unit: 'FT-01', utilizationPct: 65 },
    { unit: 'FT-02', utilizationPct: 88 },
    { unit: 'FT-03', utilizationPct: 72 },
    { unit: 'FT-04', utilizationPct: 91 },
    { unit: 'FT-05', utilizationPct: 55 },
    { unit: 'FT-06', utilizationPct: 79 },
    { unit: 'FT-07', utilizationPct: 45 },
    { unit: 'FT-08', utilizationPct: 82 },
    { unit: 'FT-09', utilizationPct: 61 },
    { unit: 'FT-10', utilizationPct: 20 },
  ],

  resolutionTimeByType: [
    { type: 'Residential', avgTime: 95 },
    { type: 'Commercial', avgTime: 72 },
    { type: 'Industrial', avgTime: 168 },
    { type: 'Vehicle', avgTime: 42 },
    { type: 'Forest', avgTime: 215 },
    { type: 'Chemical', avgTime: 310 },
    { type: 'Slum', avgTime: 150 },
  ],

  monthlyTrend: [
    { month: 'Apr', incidents: 38, resolved: 36 },
    { month: 'May', incidents: 42, resolved: 40 },
    { month: 'Jun', incidents: 55, resolved: 51 },
    { month: 'Jul', incidents: 61, resolved: 58 },
    { month: 'Aug', incidents: 49, resolved: 46 },
    { month: 'Sep', incidents: 45, resolved: 43 },
    { month: 'Oct', incidents: 12, resolved: 8 },
  ],
};
