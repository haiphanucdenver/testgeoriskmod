// AI-Driven Lore Collection with extraction_agent and research_agent
import { Button } from "./ui/button";
import { Card } from "./ui/card";
import { Badge } from "./ui/badge";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "./ui/accordion";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "./ui/dialog";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Textarea } from "./ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "./ui/tooltip";
import {
  Upload,
  Globe,
  MapPin,
  CheckCircle2,
  Circle,
  Mountain,
  CloudRain,
  Activity,
  Map,
  BookOpen,
  Users,
  Building2,
  AlertCircle,
  Plus,
  Calendar,
  Trash2,
  Download,
  Search,
  Filter,
  X,
  Edit,
  ArrowUpDown,
  CheckSquare,
  Square,
  BarChart3,
  TrendingUp,
  Database,
  ShieldCheck,
  ShieldAlert,
  ShieldX,
  Info,
  FileText,
  History,
  RefreshCw,
  Wifi,
  WifiOff,
  Eye,
  Sparkles,
} from "lucide-react";
import React from "react";
import { useState, useEffect } from "react";
import { dataSourceAPI, loreAPI, riskCalculationAPI, eventAPI, locationAPI, hFactorAPI, lFactorAPI, vFactorAPI, getErrorMessage, checkAPIConnection } from "../services/api";
import type { DataSource } from "../services/api";
import { toast } from "sonner";

interface DataManagementProps {
  mapLocation: {
    lat: number;
    lng: number;
    zoom: number;
  };
  onRiskCalculated?: (riskData: any) => void;
}

interface DataVersion {
  version: number;
  timestamp: Date;
  fileName?: string;
  fileSize?: number;
  uploadedBy?: string;
  changes?: string;
}

interface DataItem {
  id: string;
  name: string;
  description: string;
  status: 'uploaded' | 'connected' | 'missing';
  fileType?: string;
  apiService?: string;
  icon: React.ReactNode;
  currentVersion?: number;
  lastUpdated?: Date;
  versions?: DataVersion[];
}

interface LoreChangeLog {
  timestamp: Date;
  action: 'created' | 'edited' | 'deleted';
  loreEntryId: string;
  changes?: string;
  previousData?: Partial<LocalLoreEntry>;
}

interface LocalLoreEntry {
  id: string;
  eventType: string;
  recency: number;  // Years ago
  location: string;
  description: string;
  source: string;
  credibility: 'eyewitness' | 'instrumented' | 'oral-tradition' | 'newspaper' | 'expert';
  spatialAccuracy: 'exact' | 'approximate' | 'general-area';
  createdAt?: Date;
  lastModified?: Date;
}

export function DataManagement({ mapLocation, onRiskCalculated }: DataManagementProps) {
  const [locationName, setLocationName] = useState<string>("Loading...");
  const [elevation, setElevation] = useState<number | null>(null);
  const [isLoadingLocation, setIsLoadingLocation] = useState(false);
  
  // API connection state
  const [isAPIConnected, setIsAPIConnected] = useState<boolean>(false);
  const [isCheckingAPI, setIsCheckingAPI] = useState<boolean>(true);
  const [isLoadingLoreEntries, setIsLoadingLoreEntries] = useState<boolean>(false);

  // Local Lore Entries state
  const [localLoreEntries, setLocalLoreEntries] = useState<LocalLoreEntry[]>([]);
  const [isLoreEntryDialogOpen, setIsLoreEntryDialogOpen] = useState(false);
  const [newLoreEntry, setNewLoreEntry] = useState<Partial<LocalLoreEntry>>({
    eventType: '',
    recency: 0,
    location: '',
    description: '',
    source: '',
    credibility: 'newspaper',
    spatialAccuracy: 'approximate'
  });

  // Search and Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCredibility, setFilterCredibility] = useState<string>('all');
  const [filterLoreType, setFilterLoreType] = useState<string>('all');

  // Edit state
  const [editingLoreEntryId, setEditingLoreEntryId] = useState<string | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingLoreEntry, setEditingLoreEntry] = useState<Partial<LocalLoreEntry>>({});

  // Sorting state
  const [sortField, setSortField] = useState<'date' | 'eventType' | 'credibility'>('date');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  // Bulk selection state
  const [selectedLoreEntryIds, setSelectedLoreEntryIds] = useState<Set<string>>(new Set());
  const [showStatistics, setShowStatistics] = useState(false);

  // Data versioning state
  const [showVersionDialog, setShowVersionDialog] = useState(false);
  const [versionItem, setVersionItem] = useState<DataItem | null>(null);
  const [loreChangeLog, setLoreChangeLog] = useState<LoreChangeLog[]>([]);
  const [showChangeLog, setShowChangeLog] = useState(false);

  // Event type selection state
  const [selectedEventType, setSelectedEventType] = useState<string>('');
  const [dateObserved, setDateObserved] = useState<string>('');

  // Risk calculation results state
  const [riskResults, setRiskResults] = useState<any>(null);
  const [isCalculating, setIsCalculating] = useState(false);
  const [isStartingAssessment, setIsStartingAssessment] = useState(false);
  const [currentEventId, setCurrentEventId] = useState<number | null>(null);

  // Submit data state for each card
  const [isSubmittingH, setIsSubmittingH] = useState(false);
  const [isSubmittingL, setIsSubmittingL] = useState(false);
  const [isSubmittingV, setIsSubmittingV] = useState(false);
  const [hDataSaved, setHDataSaved] = useState(false);
  const [lDataSaved, setLDataSaved] = useState(false);
  const [vDataSaved, setVDataSaved] = useState(false);

  // H Factor - Detailed Data Entry State
  const [hData, setHData] = useState({
    // DEM Data
    dem_file: null as File | null,
    elevation_min: '',
    elevation_max: '',
    elevation_avg: '',
    slope_min: '',
    slope_max: '',
    slope_avg: '',
    aspect: '',
    curvature: '',

    // Lithology Data
    rock_type: '',
    rock_strength: '', // MPa
    weathering_degree: '',
    fracture_density: '', // fractures per meter
    permeability: '', // m/s

    // Soil Data
    soil_depth: '', // meters
    soil_cohesion: '', // kPa
    friction_angle: '', // degrees
    soil_density: '', // kg/m³
    soil_moisture: '', // %

    // Rainfall Data
    rainfall_intensity: '', // mm/hr
    rainfall_duration: '', // hours
    rain_exceed: '', // exceedance probability 0-1
    return_period: '', // years

    // Seismic Data
    peak_ground_acceleration: '', // g
    earthquake_magnitude: '',
    frequency: '', // /week
    distance_to_fault: '', // km
  });

  // V Factor - Detailed Data Entry State (focused on risk calculation)
  const [vData, setVData] = useState({
    // Core V Factor components
    exposure: '', // 0-1 score (weight: 0.7)
    fragility: '', // 0-1 score (weight: 0.3)
    criticality_weight: '', // optional adjustment (default: 0.3)

    // Supporting data for exposure calculation
    population_density: '', // people/km²
    building_count: '',
    road_length: '', // meters
    critical_facilities_count: '',

    // Supporting data for fragility calculation
    avg_building_age: '', // years
    structure_type: '',
  });

  // AI-Driven Lore Collection state
  const [loreScenario, setLoreScenario] = useState<'story' | 'discover' | 'observation'>('story');
  const [loreStories, setLoreStories] = useState<any[]>([]);
  const [storyForm, setStoryForm] = useState({
    title: '',
    story_text: '',
    location_description: ''
    // AI extracts: recency, credibility, spatial relevance automatically
  });
  const [discoverForm, setDiscoverForm] = useState({
    latitude: mapLocation.lat,
    longitude: mapLocation.lng,
    location_radius_m: 10000
    // AI discovers lore and extracts all metadata automatically
  });
  const [observationForm, setObservationForm] = useState({
    title: '',
    latitude: mapLocation.lat,
    longitude: mapLocation.lng,
    observation_sight: '',
    observation_sound: '',
    // added fields used elsewhere in the file
    recency_years: '',
    credibility: '',
    spatial_relevance_m: ''
  });

  // Event Drivers (H) data items
  const [eventDriversData, setEventDriversData] = useState<DataItem[]>([
    {
      id: 'dem',
      name: 'DEM (Digital Elevation Model)',
      description: 'Elevation, slope, and curvature data',
      status: 'missing',
      fileType: 'GeoTIFF',
      apiService: 'USGS/SRTM',
      icon: <Mountain className="h-4 w-4" />
    },
    {
      id: 'lithology',
      name: 'Geology & Lithology',
      description: 'Rock types and geological structure',
      status: 'missing',
      fileType: 'Shapefile, GeoJSON',
      apiService: 'USGS Geology',
      icon: <Map className="h-4 w-4" />
    },
    {
      id: 'soil',
      name: 'Soil Depth & Composition',
      description: 'Soil thickness and properties',
      status: 'missing',
      fileType: 'GeoTIFF, CSV',
      icon: <Map className="h-4 w-4" />
    },
    {
      id: 'rainfall',
      name: 'Rainfall Intensity-Duration',
      description: 'Precipitation data and intensity',
      status: 'missing',
      fileType: 'CSV, NetCDF',
      apiService: 'NOAA',
      icon: <CloudRain className="h-4 w-4" />
    },
    {
      id: 'seismic',
      name: 'Seismic Activity',
      description: 'Ground shaking and earthquake data',
      status: 'missing',
      fileType: 'CSV, GeoJSON',
      apiService: 'USGS Earthquake',
      icon: <Activity className="h-4 w-4" />
    },
  ]);

  // Local Lore & History (L) data items
  const [localLoreData, setLocalLoreData] = useState<DataItem[]>([
    {
      id: 'local-lore-entries',
      name: 'Local Lore Entry Inventory',
      description: 'Records of past mass movements',
      status: 'missing',
      fileType: 'CSV, JSON, Excel',
      icon: <BookOpen className="h-4 w-4" />
    },
    {
      id: 'local-reports',
      name: 'Local Reports & Field Notes',
      description: 'Community observations and field data',
      status: 'missing',
      fileType: 'PDF, DOCX, Text',
      icon: <BookOpen className="h-4 w-4" />
    },
    {
      id: 'indigenous-knowledge',
      name: 'Indigenous Knowledge',
      description: 'Traditional and indigenous observations',
      status: 'missing',
      fileType: 'Text, Audio, PDF',
      icon: <Users className="h-4 w-4" />
    },
  ]);

  // Vulnerability (V) data items
  const [vulnerabilityData, setVulnerabilityData] = useState<DataItem[]>([
    {
      id: 'infrastructure',
      name: 'Infrastructure',
      description: 'Roads, utilities, buildings from OSM',
      status: 'connected',
      apiService: 'OpenStreetMap',
      icon: <Building2 className="h-4 w-4" />
    },
    {
      id: 'population',
      name: 'Population Density',
      description: 'Population distribution from OSM places',
      status: 'connected',
      apiService: 'OpenStreetMap',
      icon: <Users className="h-4 w-4" />
    },
    {
      id: 'building-types',
      name: 'Building Typology',
      description: 'Construction types and fragility data',
      status: 'missing',
      fileType: 'Shapefile, GeoJSON',
      icon: <Building2 className="h-4 w-4" />
    },
    {
      id: 'critical-facilities',
      name: 'Critical Facilities',
      description: 'Hospitals, schools, fire stations, police from OSM',
      status: 'connected',
      apiService: 'OpenStreetMap',
      icon: <AlertCircle className="h-4 w-4" />
    },
  ]);

  // Calculate completeness for each factor
  const calculateCompleteness = (dataItems: DataItem[]) => {
    const total = dataItems.length;
    const completed = dataItems.filter(item => item.status !== 'missing').length;
    return { completed, total, percentage: (completed / total) * 100 };
  };

  const hCompleteness = calculateCompleteness(eventDriversData);
  const lCompleteness = calculateCompleteness(localLoreData);
  const vCompleteness = calculateCompleteness(vulnerabilityData);

  // Calculate data quality indicators
  const calculateDataQuality = (dataItems: DataItem[], factorType: 'H' | 'L' | 'V') => {
    const total = dataItems.length;
    const uploaded = dataItems.filter(item => item.status === 'uploaded').length;
    const connected = dataItems.filter(item => item.status === 'connected').length;
    const percentage = ((uploaded + connected) / total) * 100;

    // For Local Lore, boost quality score if we have high-credibility local lore entries
    let qualityBoost = 0;
    if (factorType === 'L' && localLoreEntries.length > 0) {
      const highCredibilityCount = localLoreEntries.filter(
        e => e.credibility === 'instrumented' || e.credibility === 'eyewitness'
      ).length;
      qualityBoost = Math.min(20, highCredibilityCount * 5); // Up to 20% boost
    }

    const adjustedPercentage = Math.min(100, percentage + qualityBoost);

    let status: 'excellent' | 'good' | 'fair' | 'poor';
    if (adjustedPercentage >= 80) status = 'excellent';
    else if (adjustedPercentage >= 60) status = 'good';
    else if (adjustedPercentage >= 40) status = 'fair';
    else status = 'poor';

    return {
      percentage: adjustedPercentage,
      status,
      uploaded,
      connected,
      total
    };
  };

  const hQuality = calculateDataQuality(eventDriversData, 'H');
  const lQuality = calculateDataQuality(localLoreData, 'L');
  const vQuality = calculateDataQuality(vulnerabilityData, 'V');

  // Calculate overall readiness
  const overallReadiness = Math.round((hQuality.percentage + lQuality.percentage + vQuality.percentage) / 3);
  const totalDataSources = eventDriversData.length + localLoreData.length + vulnerabilityData.length;
  const activeDataSources =
    (hQuality.uploaded + hQuality.connected) +
    (lQuality.uploaded + lQuality.connected) +
    (vQuality.uploaded + vQuality.connected);

  // Handle file upload
  const handleFileUpload = (itemId: string, dataType: 'H' | 'L' | 'V') => {
    const input = document.createElement('input');
    input.type = 'file';

    // Set accepted file types based on item
    const item = [...eventDriversData, ...localLoreData, ...vulnerabilityData].find(d => d.id === itemId);
    if (item?.fileType) {
      const extensions = item.fileType.split(',').map(ext => {
        const trimmed = ext.trim().toLowerCase();
        if (trimmed === 'geotiff') return '.tif,.tiff';
        if (trimmed === 'shapefile') return '.shp,.shx,.dbf,.prj';
        if (trimmed === 'csv') return '.csv';
        if (trimmed === 'json' || trimmed === 'geojson') return '.json,.geojson';
        if (trimmed === 'kml') return '.kml';
        if (trimmed === 'pdf') return '.pdf';
        if (trimmed === 'docx') return '.docx,.doc';
        if (trimmed === 'text') return '.txt';
        if (trimmed === 'excel') return '.xlsx,.xls';
        return '';
      }).filter(e => e).join(',');
      input.accept = extensions;
    }

    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        try {
          // Show loading toast
          const loadingToast = toast.loading(`Uploading ${file.name}...`);

          // Upload file to backend
          const response = await dataSourceAPI.uploadFile(file, itemId, 'Current User');

          const now = new Date();
          const currentVersion = response.version;
          const currentItem = [...eventDriversData, ...localLoreData, ...vulnerabilityData].find(d => d.id === itemId);
          const existingVersions = currentItem?.versions || [];

          const newVersion: DataVersion = {
            version: currentVersion,
            timestamp: now,
            fileName: file.name,
            fileSize: file.size,
            uploadedBy: 'Current User',
            changes: currentVersion === 1 ? 'Initial upload' : `Updated data file to ${file.name}`
          };

          const updatedVersions = [...existingVersions, newVersion];

          // Update status with version info
          if (dataType === 'H') {
            setEventDriversData(prev => prev.map(item =>
              item.id === itemId ? {
                ...item,
                status: 'uploaded' as const,
                currentVersion,
                lastUpdated: now,
                versions: updatedVersions
              } : item
            ));
          } else if (dataType === 'L') {
            setLocalLoreData(prev => prev.map(item =>
              item.id === itemId ? {
                ...item,
                status: 'uploaded' as const,
                currentVersion,
                lastUpdated: now,
                versions: updatedVersions
              } : item
            ));
          } else if (dataType === 'V') {
            setVulnerabilityData(prev => prev.map(item =>
              item.id === itemId ? {
                ...item,
                status: 'uploaded' as const,
                currentVersion,
                lastUpdated: now,
                versions: updatedVersions
              } : item
            ));
          }

          // Dismiss loading toast and show success
          toast.dismiss(loadingToast);
          toast.success(`File uploaded successfully! (Version ${currentVersion})`);

          console.log(`Uploaded ${file.name} for ${itemId} (Version ${currentVersion})`, response);
        } catch (error) {
          console.error('File upload failed:', error);
          toast.error(`Upload failed: ${getErrorMessage(error)}`);
        }
      }
    };

    input.click();
  };

  // Handle API connection
  const handleConnectAPI = async (itemId: string, dataType: 'H' | 'L' | 'V') => {
    try {
      const loadingToast = toast.loading(`Connecting to API...`);
      const now = new Date();
      const currentItem = [...eventDriversData, ...localLoreData, ...vulnerabilityData].find(d => d.id === itemId);
      const currentVersion = (currentItem?.currentVersion || 0) + 1;
      const existingVersions = currentItem?.versions || [];

      // Update data source in backend
      await dataSourceAPI.update(itemId, {
        status: 'connected',
        current_version: currentVersion,
        last_updated: now.toISOString(),
        uploaded_by: 'System',
      });

      const newVersion: DataVersion = {
        version: currentVersion,
        timestamp: now,
        uploadedBy: 'System',
        changes: currentVersion === 1 ? `Connected to ${currentItem?.apiService}` : `Refreshed connection to ${currentItem?.apiService}`
      };

      const updatedVersions = [...existingVersions, newVersion];

      // Update status to connected with version info
      if (dataType === 'H') {
        setEventDriversData(prev => prev.map(item =>
          item.id === itemId ? {
            ...item,
            status: 'connected' as const,
            currentVersion,
            lastUpdated: now,
            versions: updatedVersions
          } : item
        ));
      } else if (dataType === 'L') {
        setLocalLoreData(prev => prev.map(item =>
          item.id === itemId ? {
            ...item,
            status: 'connected' as const,
            currentVersion,
            lastUpdated: now,
            versions: updatedVersions
          } : item
        ));
      } else if (dataType === 'V') {
        setVulnerabilityData(prev => prev.map(item =>
          item.id === itemId ? {
            ...item,
            status: 'connected' as const,
            currentVersion,
            lastUpdated: now,
            versions: updatedVersions
          } : item
        ));
      }

      toast.dismiss(loadingToast);
      toast.success(`Connected to ${currentItem?.apiService} successfully!`);

      console.log(`Connected to API for ${itemId} (Version ${currentVersion})`);
    } catch (error) {
      console.error('API connection failed:', error);
      toast.error(`Connection failed: ${getErrorMessage(error)}`);
    }
  };

  // Handle DEM processing
  const handleProcessDEM = async (itemId: string) => {
    try {
      const loadingToast = toast.loading(`Processing DEM... This may take a minute.`);

      // Process DEM with current map location as center
      const response = await dataSourceAPI.processDEM(
        itemId,
        mapLocation.lat,
        mapLocation.lng,
        10, // 10km extent
        80, // 80 rows
        80  // 80 cols = 6,400 cells
      );

      toast.dismiss(loadingToast);
      toast.success(
        `DEM processed! Extracted ${response.values_inserted} terrain values. ` +
        `Elevation range: ${response.statistics.min_elevation_m}m - ${response.statistics.max_elevation_m}m`,
        { duration: 5000 }
      );

      console.log('DEM processing result:', response);
    } catch (error) {
      console.error('DEM processing failed:', error);
      toast.error(`Processing failed: ${getErrorMessage(error)}`);
    }
  };

  // Handle adding local lore entry
  const handleAddLocalLoreEntry = async () => {
    if (!newLoreEntry.eventType || newLoreEntry.recency === undefined || !newLoreEntry.description) {
      toast.error('Please fill in all required fields');
      return;
    }

    try {
      // Save to local_lore table with proper column mapping
      const response = await lFactorAPI.submitStory({
        location_name: locationName,
        latitude: mapLocation.lat,
        longitude: mapLocation.lng,
        location_description: `L Factor story collected on ${new Date().toLocaleDateString()}`,
        region: '',
        title: newLoreEntry.eventType || 'Local Lore Entry',
        story: newLoreEntry.description || '',
        location_place: newLoreEntry.location || locationName,
        years_ago: newLoreEntry.recency,
        credibility: newLoreEntry.credibility || 'newspaper',
        spatial_accuracy: newLoreEntry.spatialAccuracy || 'approximate',
      });

      const now = new Date();
      const loreEntry: LocalLoreEntry = {
        id: response.lore_id.toString(),
        eventType: newLoreEntry.eventType || '',
        recency: newLoreEntry.recency || 0,
        location: newLoreEntry.location || '',
        description: newLoreEntry.description || '',
        source: newLoreEntry.source || '',
        credibility: newLoreEntry.credibility || 'newspaper',
        spatialAccuracy: newLoreEntry.spatialAccuracy || 'approximate',
        createdAt: now,
        lastModified: now
      };

      // push the constructed loreEntry (was using `event` which is undefined)
      setLocalLoreEntries(prev => [...prev, loreEntry]);

      // Add to change log
      setLoreChangeLog(prev => [...prev, {
        timestamp: now,
        action: 'created',
        loreEntryId: loreEntry.id,
        changes: `Created new ${loreEntry.eventType} lore entry: ${loreEntry.recency} years ago`
      }]);

      setIsLoreEntryDialogOpen(false);
      setNewLoreEntry({
        eventType: '',
        recency: 0,
        location: '',
        description: '',
        source: '',
        credibility: 'newspaper',
        spatialAccuracy: 'approximate'
      });

      // Update Local Lore status to uploaded if first event
      setLocalLoreData(prev => prev.map(item =>
        item.id === 'local-lore-entries' ? { ...item, status: 'uploaded' as const } : item
      ));

      toast.success(`L Factor story saved to database! Lore ID: ${response.lore_id}`);
    } catch (error) {
      console.error('Failed to save local lore entry:', error);
      toast.error(`Failed to save event: ${getErrorMessage(error)}`);
    }
  };

  // Handle deleting local lore entry
  const handleDeleteLoreEntry = async (loreEntryId: string) => {
    try {
      const deletedLoreEntry = localLoreEntries.find(e => e.id === loreEntryId);

      // Call backend API to delete event from local_lore table
      await lFactorAPI.delete(loreEntryId);

      // Use functional update to ensure we compute remaining entries correctly,
      // and update Local Lore data status if no events left.
      setLocalLoreEntries(prev => {
        const remaining = prev.filter(e => e.id !== loreEntryId);
        if (remaining.length === 0) {
          setLocalLoreData(p => p.map(item =>
            item.id === 'local-lore-entries' ? { ...item, status: 'missing' as const } : item
          ));
        }
        return remaining;
      });

      // Add to change log
      if (deletedLoreEntry) {
        setLoreChangeLog(prev => [...prev, {
          timestamp: new Date(),
          action: 'deleted',
          loreEntryId: loreEntryId,
          changes: `Deleted ${deletedLoreEntry.eventType} lore entry: ${deletedLoreEntry.recency}`,
          previousData: deletedLoreEntry
        }]);
      }

      toast.success('L Factor story deleted successfully');
    } catch (error) {
      console.error('Failed to delete local lore entry:', error);
      toast.error(`Failed to delete event: ${getErrorMessage(error)}`);
    }
  };

  // Handle opening edit dialog
  const handleOpenEditLoreDialog = (loreEntry: LocalLoreEntry) => {
    setEditingLoreEntryId(loreEntry.id);
    setEditingLoreEntry({
      eventType: loreEntry.eventType,
      recency: loreEntry.recency,
      location: loreEntry.location,
      description: loreEntry.description,
      source: loreEntry.source,
      credibility: loreEntry.credibility,
      spatialAccuracy: loreEntry.spatialAccuracy
    });
    setIsEditDialogOpen(true);
  };

  // Handle saving edited event
  const handleSaveEditedLoreEntry = async () => {
    if (!editingLoreEntryId || !editingLoreEntry.eventType || editingLoreEntry.recency === undefined || !editingLoreEntry.description) {
      toast.error('Please fill in all required fields');
      return;
    }

    try {
      const now = new Date();
      // Ensure we get a nullable original entry rather than risking undefined usage
      const originalLoreEntry = localLoreEntries.find(e => e.id === editingLoreEntryId) || null;

      // Build changes description (typed and defensive)
      const changes: string[] = [];
      if (originalLoreEntry) {
        const prev = originalLoreEntry;
        const curr = editingLoreEntry;

        if (curr.eventType && curr.eventType !== prev.eventType) {
          changes.push(`type: ${prev.eventType} -> ${curr.eventType}`);
        }

        // Only compare recency when a numeric value is provided
        if (typeof curr.recency === 'number' && curr.recency !== prev.recency) {
          changes.push(`recency: ${prev.recency} years -> ${curr.recency} years`);
        }

        if (curr.credibility && curr.credibility !== prev.credibility) {
          changes.push(`credibility: ${prev.credibility} -> ${curr.credibility}`);
        }
      }

      // Call backend API to update event in local_lore table
      await lFactorAPI.update(editingLoreEntryId, {
        location_name: locationName,
        latitude: mapLocation.lat,
        longitude: mapLocation.lng,
        location_description: `L Factor story updated on ${new Date().toLocaleDateString()}`,
        region: '',
        title: editingLoreEntry.eventType || 'Local Lore Entry',
        story: editingLoreEntry.description || '',
        location_place: editingLoreEntry.location || locationName,
        years_ago: editingLoreEntry.recency,
        credibility: editingLoreEntry.credibility || 'newspaper',
        spatial_accuracy: editingLoreEntry.spatialAccuracy || 'approximate',
      });

      setLocalLoreEntries(prev => prev.map(loreEntry =>
        loreEntry.id === editingLoreEntryId
          ? {
              ...loreEntry,
              eventType: editingLoreEntry.eventType || loreEntry.eventType,
              recency: editingLoreEntry.recency !== undefined ? editingLoreEntry.recency : loreEntry.recency,
              location: editingLoreEntry.location || loreEntry.location,
              description: editingLoreEntry.description || loreEntry.description,
              source: editingLoreEntry.source || loreEntry.source,
              credibility: editingLoreEntry.credibility || loreEntry.credibility,
              spatialAccuracy: editingLoreEntry.spatialAccuracy || loreEntry.spatialAccuracy,
              lastModified: now
            }
          : loreEntry
      ));

      // Add to change log
      if (originalLoreEntry && changes.length > 0) {
        setLoreChangeLog(prev => [...prev, {
          timestamp: now,
          action: 'edited',
          loreEntryId: editingLoreEntryId,
          changes: `Edited lore entry: ${changes.join(', ')}`,
          previousData: originalLoreEntry
        }]);
      }

      setIsEditDialogOpen(false);
      setEditingLoreEntryId(null);
      setEditingLoreEntry({});

      toast.success('Local lore entry updated successfully!');
    } catch (error) {
      console.error('Failed to update local lore entry:', error);
      toast.error(`Failed to update event: ${getErrorMessage(error)}`);
    }
  };

  // Handle canceling edit
  const handleCancelEdit = () => {
    setIsEditDialogOpen(false);
    setEditingLoreEntryId(null);
    setEditingLoreEntry({});
  };

  // Handle bulk selection
  const handleToggleSelectEvent = (loreEntryId: string) => {
    setSelectedLoreEntryIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(loreEntryId)) {
        newSet.delete(loreEntryId);
      } else {
        newSet.add(loreEntryId);
      }
      return newSet;
    });
  };
 
  // Helper: compute filtered & sorted lore entries (used by UI and selection helpers)
  const getFilteredAndSortedLoreEntries = () => {
    const filtered = localLoreEntries
      .filter(loreEntry => {
        // Search filter (searches across multiple fields)
        const searchLower = searchQuery.toLowerCase();
        const matchesSearch = searchQuery === '' ||
          loreEntry.eventType.toLowerCase().includes(searchLower) ||
          loreEntry.recency.toString().includes(searchLower) ||
          loreEntry.location.toLowerCase().includes(searchLower) ||
          loreEntry.description.toLowerCase().includes(searchLower) ||
          loreEntry.source.toLowerCase().includes(searchLower);

        // Credibility filter
        const matchesCredibility = filterCredibility === 'all' || loreEntry.credibility === filterCredibility;

        // Event type filter
        const matchesEventType = filterLoreType === 'all' || loreEntry.eventType.toLowerCase().includes(filterLoreType.toLowerCase());

        return matchesSearch && matchesCredibility && matchesEventType;
      });

    const sorted = filtered.sort((a, b) => {
      let comparison = 0;

      if (sortField === 'date') {
        const aDate = a.createdAt ? a.createdAt.toISOString() : '';
        const bDate = b.createdAt ? b.createdAt.toISOString() : '';
        comparison = aDate.localeCompare(bDate);
      } else if (sortField === 'eventType') {
        comparison = a.eventType.localeCompare(b.eventType);
      } else if (sortField === 'credibility') {
        const credibilityOrder: Record<string, number> = { 'instrumented': 1, 'eyewitness': 2, 'expert': 3, 'newspaper': 4, 'oral-tradition': 5 };
        comparison = (credibilityOrder[a.credibility] || 99) - (credibilityOrder[b.credibility] || 99);
      }

      return sortDirection === 'asc' ? comparison : -comparison;
    });

    return sorted;
  };

  // Handle select all visible events
  const handleSelectAllVisible = () => {
    const visible = getFilteredAndSortedLoreEntries();
    if (selectedLoreEntryIds.size === visible.length) {
      // If all visible are selected, deselect all
      setSelectedLoreEntryIds(new Set());
    } else {
      // Select all visible events
      setSelectedLoreEntryIds(new Set(visible.map(e => e.id)));
    }
  };

  // Handle bulk delete
  const handleBulkDelete = () => {
    if (selectedLoreEntryIds.size === 0) return;

    setLocalLoreEntries(prev => {
      const remaining = prev.filter(e => !selectedLoreEntryIds.has(e.id));
      // Update Local Lore status back to missing if no events left
      if (remaining.length === 0) {
        setLocalLoreData(p => p.map(item =>
          item.id === 'local-lore-entries' ? { ...item, status: 'missing' as const } : item
        ));
      }
      return remaining;
    });

    setSelectedLoreEntryIds(new Set());
  };

  // Handle bulk export
  const handleBulkExportLoreCSV = () => {
    if (selectedLoreEntryIds.size === 0) return;

    const selectedLoreEntries = localLoreEntries.filter(e => selectedLoreEntryIds.has(e.id));
    const headers = ['Lore Type', 'Recency (years ago)', 'Location', 'Description', 'Source', 'Credibility', 'Spatial Accuracy'];
    const csvContent = [
      headers.join(','),
      ...selectedLoreEntries.map(loreEntry => [
        `"${loreEntry.eventType}"`,
        `"${loreEntry.recency}"`,
        `"${loreEntry.location}"`,
        `"${loreEntry.description.replace(/"/g, '""')}"`,
        `"${loreEntry.source}"`,
        `"${loreEntry.credibility}"`,
        `"${loreEntry.spatialAccuracy}"`
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `selected-events-${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleBulkExportJSON = () => {
    if (selectedLoreEntryIds.size === 0) return;

    const selectedLoreEntries = localLoreEntries.filter(e => selectedLoreEntryIds.has(e.id));
    const jsonContent = JSON.stringify(selectedLoreEntries, null, 2);
    const blob = new Blob([jsonContent], { type: 'application/json' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `selected-events-${new Date().toISOString().split('T')[0]}.json`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Handle exporting events to CSV
  const handleExportLoreCSV = () => {
    if (localLoreEntries.length === 0) return;

    const headers = ['Lore Type', 'Recency (years ago)', 'Location', 'Description', 'Source', 'Credibility', 'Spatial Accuracy'];
    const csvContent = [
      headers.join(','),
      ...localLoreEntries.map(loreEntry => [
        `"${loreEntry.eventType}"`,
        `"${loreEntry.recency}"`,
        `"${loreEntry.location}"`,
        `"${loreEntry.description.replace(/"/g, '""')}"`,
        `"${loreEntry.source}"`,
        `"${loreEntry.credibility}"`,
        `"${loreEntry.spatialAccuracy}"`
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `historical-events-${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Handle exporting events to JSON
  const handleExportJSON = () => {
    if (localLoreEntries.length === 0) return;

    const jsonContent = JSON.stringify(localLoreEntries, null, 2);
    const blob = new Blob([jsonContent], { type: 'application/json' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `historical-events-${new Date().toISOString().split('T')[0]}.json`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Load lore stories from database
  const loadLoreStories = async () => {
    try {
      const response = await loreAPI.getStories();
      setLoreStories(response.stories);
      console.log(`Loaded ${response.count} lore stories`);
    } catch (error) {
      // Silently fail - this is an optional advanced feature
      console.log('AI-driven lore collection not available (optional feature)');
    }
  };

  // Scenario 1: Submit story/lore for AI analysis
  const handleSubmitStory = async () => {
    if (!storyForm.title || !storyForm.story_text) {
      toast.error('Please provide both title and story text');
      return;
    }

    const loadingToast = toast.loading('Submitting story to AI for analysis...');

    // Build payload once (used by primary API and fallback)
    const payload = {
      title: storyForm.title,
      story_text: storyForm.story_text,
      location_description: storyForm.location_description,
      latitude: mapLocation.lat,
      longitude: mapLocation.lng,
      created_by: 'Current User'
    };

    try {
      // Try the primary API wrapper first
      let response = await loreAPI.submitStory(payload);

      // If the wrapper returns a fetch-like Response, normalize to object
      if (response instanceof Response) {
        response = await response.json();
      }

      toast.dismiss(loadingToast);

      // Defensive handling of AI response
      const aiStatus = (response as any)?.ai_status;
      const aiResults = (response as any)?.ai_results;

      if (aiStatus === 'completed') {
        toast.success(`Story analyzed successfully! L-Score: ${(response as any).l_score?.toFixed?.(3) ?? (response as any).l_score} | Lore ID: ${(response as any).lore_id}`);
      } else {
        // Use available message fields or fallback
        const errMsg = (response as any)?.message ?? (response as any)?.error ?? 'Story submitted but AI analysis failed';
        toast.error(typeof errMsg === 'string' ? errMsg : 'Story submitted but AI analysis failed');
      }

      // Mark L Factor as saved and reload
      setLDataSaved(true);
      setStoryForm({ title: '', story_text: '', location_description: '' });
      await loadLoreStories();
    } catch (error) {
      // Primary call failed (network / wrapper). Attempt a simple fetch fallback before giving up.
      console.warn('Primary loreAPI.submitStory failed, attempting direct fetch fallback:', error);

      try {
        // Prefer explicit VITE_API_BASE_URL, fall back to window.location.origin.
        // Do NOT append "/api" here — construct a broad set of candidates so one matches your backend.
        const BASE_CANDIDATE = ((import.meta as any)?.env?.VITE_API_BASE_URL || '').replace(/\/$/, '');
        const apiRoot = BASE_CANDIDATE || window.location.origin;

        const normalize = (u: string) => u.replace(/\/+$/, '');
        const baseRoot = normalize(apiRoot);

        // Expanded candidate list - covers common variants, API versioning and ai wrappers.
        const candidates = [
          // Correct endpoint (should be tried first)
          `${baseRoot}/api/lore/submit-story`,

          // common "API" prefixes
          `${baseRoot}/api/lore/submit`,
          `${baseRoot}/lore/submit`,
          `${baseRoot}/api/lore`,
          `${baseRoot}/lore`,

          // ai wrapper / agent endpoints
          `${baseRoot}/api/ai/lore/submit`,
          `${baseRoot}/ai/lore/submit`,
          `${baseRoot}/api/ai/submit`,
          `${baseRoot}/ai/submit`,

          // stories endpoints
          `${baseRoot}/api/stories/submit`,
          `${baseRoot}/stories/submit`,
          `${baseRoot}/api/stories`,
          `${baseRoot}/stories`,

          // versioned APIs
          `${baseRoot}/api/v1/lore/submit`,
          `${baseRoot}/api/v1/stories/submit`,

          // generic submit endpoints (last resort)
          `${baseRoot}/submit`,
          `${baseRoot}/api/submit`,
        ];

        console.info('Fallback candidates using apiRoot:', apiRoot);

        const errors: string[] = [];
        let successJson: any = null;
        let successUrl: string | null = null;

        for (const url of candidates) {
          try {
            console.info('Attempting fallback endpoint:', url);
            const resp = await fetch(url, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(payload),
            });

            if (!resp.ok) {
              // capture response body (truncated) to aid debugging
              const txt = await resp.text().catch(() => '');
              const short = typeof txt === 'string' && txt.length > 400 ? txt.slice(0, 400) + '…' : txt;
              errors.push(`${url} -> ${resp.status} ${resp.statusText}${short ? ` : ${short}` : ''}`);
              console.warn('Fallback endpoint failed:', url, resp.status, resp.statusText);
              continue;
            }

            // success
            successJson = await resp.json().catch(() => null);
            successUrl = url;
            break;
          } catch (e: any) {
            console.warn('Fetch attempt error for', url, e);
            errors.push(`${url} -> ${e?.message || String(e)}`);
          }
        }

        toast.dismiss(loadingToast);

        if (!successJson) {
          const combined = errors.join(' | ');
          // log full detail to console for debugging
          console.error('No fallback endpoint succeeded. Tried endpoints:', candidates, 'errors:', errors);

          // show concise guidance to user with a few example failures
          toast.error(
            `No fallback endpoint succeeded (checked ${candidates.length} URLs). ` +
            `Open console for details. Common fixes: set VITE_API_BASE_URL in .env to your backend root (e.g. VITE_API_BASE_URL=http://localhost:3001) and restart the dev server.`
          );

          // also throw so outer catch shows message / telemetry if present
          throw new Error(
            `No fallback endpoint succeeded. Tried ${candidates.length} endpoints. First failures: ${errors.slice(0,5).join(' | ')}`
          );
        }

        // Handle fallback response similarly
        if (successJson?.ai_status === 'completed') {
          toast.success(`Story analyzed successfully! L-Score: ${successJson.l_score?.toFixed?.(3) ?? successJson.l_score} | Lore ID: ${successJson.lore_id} (via ${successUrl})`);
        } else {
          const errMsg = successJson?.message ?? successJson?.error ?? `Story submitted but AI analysis failed (endpoint: ${successUrl})`;
          toast.error(typeof errMsg === 'string' ? errMsg : 'Story submitted but AI analysis failed');
        }

        setLDataSaved(true);
        setStoryForm({ title: '', story_text: '', location_description: '' });
        await loadLoreStories();
      } catch (fallbackError) {
        toast.dismiss(loadingToast);
        console.error('Failed to submit story (primary + fallback):', fallbackError);
        const message = getErrorMessage(fallbackError) || 'Failed to submit story: network or server error';
        toast.error(message);
      }
    }
  };

  // Scenario 2: AI discovers lore at location
  const handleDiscoverLore = async () => {
    if (!discoverForm.latitude || !discoverForm.longitude) {
      toast.error('Please provide latitude and longitude');
      return;
    }

    const loadingToast = toast.loading('AI searching for lore at location...');

    try {
      const response = await loreAPI.discoverAtLocation({
        latitude: discoverForm.latitude,
        longitude: discoverForm.longitude,
        location_radius_m: discoverForm.location_radius_m || 10000,
        created_by: 'AI Agent'
      });

      toast.dismiss(loadingToast);

      if (response.lore_ids && response.lore_ids.length > 0) {
        toast.success(`AI discovered ${response.lore_ids.length} lore stories! Location ID: ${response.location_id}`);
      } else {
        toast.info('No lore found at this location. Try expanding the search radius.');
      }

      // Mark L Factor as saved
      setLDataSaved(true);

      // Reload stories
      await loadLoreStories();
    } catch (error) {
      toast.dismiss(loadingToast);
      console.error('Failed to discover lore:', error);
      toast.error(getErrorMessage(error));
    }
  };

  // Scenario 3: Submit observation for AI search
  const handleSubmitObservation = async () => {
    if (!observationForm.title || !observationForm.latitude || !observationForm.longitude) {
      toast.error('Please provide title, latitude, and longitude');
      return;
    }

    const loadingToast = toast.loading('Submitting observation to AI for analysis...');

    try {
      const response = await loreAPI.submitObservation({
        title: observationForm.title,
        latitude: observationForm.latitude,
        longitude: observationForm.longitude,
        observation_sight: observationForm.observation_sight,
        observation_sound: observationForm.observation_sound,
        observation_datetime: new Date().toISOString(),
        created_by: 'Current User'
      });

      toast.dismiss(loadingToast);

      // Defensive handling of AI response
      const aiStatus = response?.ai_status;
      const aiResults = response?.ai_results;

      if (aiStatus === 'completed') {
        const interpretation = typeof aiResults?.interpretation === 'string'
          ? aiResults.interpretation
          : (aiResults?.summary ?? 'No interpretation returned');

        const urgency = (aiResults?.urgency_level ?? aiResults?.urgency ?? 'normal') as string;

        if (urgency.toString().toLowerCase() === 'high' || urgency.toString().toLowerCase() === 'urgent') {
          toast.error(`URGENT: ${interpretation}`, { duration: 10000 });
        } else {
          toast.success(`Observation analyzed: ${interpretation}`);
        }
      } else {
        // Defensive: build a readable error message even if response shape varies
        // Use the known 'message' field and fall back to any legacy error fields if present.
        const errField = response?.message ?? (response as any)?.error ?? (response as any)?.error_message;
        const fallback = 'Observation submitted but AI analysis failed';
        const errMessage =
          typeof errField === 'string'
            ? errField
            : (typeof response === 'string' ? response : fallback);

        toast.error(errMessage);
      }

      // Mark L Factor as saved
      setLDataSaved(true);

      // Clear form and reload stories
      setObservationForm({
        title: '',
        latitude: mapLocation.lat,
        longitude: mapLocation.lng,
        observation_sight: '',
        observation_sound: '',
        recency_years: '',
        credibility: '',
        spatial_relevance_m: ''
      });
      await loadLoreStories();
    } catch (error) {
      toast.dismiss(loadingToast);
      console.error('Failed to submit observation:', error);
      toast.error(getErrorMessage(error));
    }
  };

  // Load lore stories on mount
  useEffect(() => {
    if (isAPIConnected) {
      loadLoreStories();
    }
  }, [isAPIConnected]);

  // Fetch location name using reverse geocoding
  useEffect(() => {
    // Use a safe access pattern for Vite env (TypeScript-friendly)
    const MAPBOX_API_KEY = (import.meta as any)?.env?.VITE_MAPBOX_API_KEY || '';

    if (!MAPBOX_API_KEY || MAPBOX_API_KEY === 'YOUR_MAPBOX_API_KEY_HERE') {
      setLocationName("Mount Hood Area, Oregon, USA");
      setIsLoadingLocation(false);
      return;
    }

    const timeoutId = setTimeout(() => {
      setIsLoadingLocation(true);
      const geocodeUrl = `https://api.mapbox.com/geocoding/v5/mapbox.places/${mapLocation.lng},${mapLocation.lat}.json?access_token=${MAPBOX_API_KEY}&types=place,locality,neighborhood,address`;

      fetch(geocodeUrl)
        .then(response => response.json())
        .then(data => {
          if (data.features && data.features.length > 0) {
            const feature = data.features[0];
            setLocationName(feature.place_name || "Unknown Location");
          } else {
            setLocationName("Unknown Location");
          }
          setIsLoadingLocation(false);
        })
        .catch(error => {
          console.error('Reverse geocoding error:', error);
          setLocationName("Location unavailable");
          setIsLoadingLocation(false);
        });
    }, 1000);

    return () => clearTimeout(timeoutId);
  }, [mapLocation.lat, mapLocation.lng]);


  // Fetch elevation data
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      const elevationUrl = `https://api.open-elevation.com/api/v1/lookup?locations=${mapLocation.lat},${mapLocation.lng}`;

      fetch(elevationUrl)
        .then(response => response.json())
        .then(data => {
          if (data.results && data.results.length > 0) {
            setElevation(Math.round(data.results[0].elevation));
          } else {
            setElevation(null);
          }
        })
        .catch(error => {
          console.error('Elevation fetch error:', error);
          setElevation(null);
        });
    }, 1000);

    return () => clearTimeout(timeoutId);
  }, [mapLocation.lat, mapLocation.lng]);

  // Auto-fill slope and curvature from elevation data
  useEffect(() => {
    const timeoutId = setTimeout(async () => {
      try {
        // Fetch elevation at 9 points in a grid around the location
        // This allows us to calculate slope and curvature
        const spacing = 0.001; // ~100m spacing
        const points = [
          { lat: mapLocation.lat - spacing, lng: mapLocation.lng - spacing }, // SW
          { lat: mapLocation.lat - spacing, lng: mapLocation.lng },           // S
          { lat: mapLocation.lat - spacing, lng: mapLocation.lng + spacing }, // SE
          { lat: mapLocation.lat, lng: mapLocation.lng - spacing },           // W
          { lat: mapLocation.lat, lng: mapLocation.lng },                     // Center
          { lat: mapLocation.lat, lng: mapLocation.lng + spacing },           // E
          { lat: mapLocation.lat + spacing, lng: mapLocation.lng - spacing }, // NW
          { lat: mapLocation.lat + spacing, lng: mapLocation.lng },           // N
          { lat: mapLocation.lat + spacing, lng: mapLocation.lng + spacing }, // NE
        ];

        const locations = points.map(p => `${p.lat},${p.lng}`).join('|');
        const elevationUrl = `https://api.open-elevation.com/api/v1/lookup?locations=${locations}`;

        const response = await fetch(elevationUrl);
        const data = await response.json();

        if (data.results && data.results.length === 9) {
          const elevations = data.results.map((r: any) => r.elevation);

          // Calculate slope (using center point and 4 cardinal directions)
          const center = elevations[4];
          const north = elevations[7];
          const south = elevations[1];
          const east = elevations[5];
          const west = elevations[3];

          // Calculate slope in degrees
          const dx = (east - west) / (2 * spacing * 111000); // Convert degrees to meters
          const dy = (north - south) / (2 * spacing * 111000);
          const slopeRadians = Math.atan(Math.sqrt(dx * dx + dy * dy));
          const slopeDegrees = (slopeRadians * 180) / Math.PI;

          // Calculate curvature (second derivative)
          // Profile curvature approximation
          const curvature = ((north + south - 2 * center) + (east + west - 2 * center)) / 2;
          const normalizedCurvature = curvature / 1000; // Normalize to reasonable range

          // Auto-fill only if fields are empty (allow user override)
          if (!hData.slope_avg) {
            setHData(prev => ({ ...prev, slope_avg: slopeDegrees.toFixed(2) }));
          }
          if (!hData.curvature) {
            setHData(prev => ({ ...prev, curvature: normalizedCurvature.toFixed(4) }));
          }
        }
      } catch (error) {
        console.error('Slope/curvature auto-fill error:', error);
      }
    }, 1500); // Delay slightly more to avoid rate limiting

    return () => clearTimeout(timeoutId);
  }, [mapLocation.lat, mapLocation.lng]); // Don't include hData to avoid infinite loops

  // Auto-fill population density from OpenStreetMap
  useEffect(() => {
    const timeoutId = setTimeout(async () => {
      try {
        // Use Nominatim reverse geocoding to get area information
        const nominatimUrl = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${mapLocation.lat}&lon=${mapLocation.lng}&zoom=14&addressdetails=1`;

        const response = await fetch(nominatimUrl, {
          headers: {
            'User-Agent': 'GeoRiskMod/1.0' // Required by OSM
          }
        });
        const data = await response.json();

        // Try to estimate population density from area type
        // This is a rough estimate based on area classification
        let estimatedDensity = 0;

        if (data.address) {
          // Rough population density estimates based on area type
          if (data.address.city || data.address.town) {
            estimatedDensity = 1500; // Urban
          } else if (data.address.village || data.address.hamlet) {
            estimatedDensity = 200; // Rural settlement
          } else if (data.address.suburb) {
            estimatedDensity = 2500; // Suburban
          } else {
            estimatedDensity = 50; // Very rural
          }

          // Adjust based on country (rough adjustments)
          const countryCode = data.address.country_code?.toUpperCase();
          if (['IN', 'BD', 'PK'].includes(countryCode)) {
            estimatedDensity *= 3; // Higher density in South Asia
          } else if (['US', 'CA', 'AU'].includes(countryCode)) {
            estimatedDensity *= 0.6; // Lower density in sprawling countries
          }
        }

        // Auto-fill only if field is empty (allow user override)
        if (!vData.population_density && estimatedDensity > 0) {
          setVData(prev => ({ ...prev, population_density: Math.round(estimatedDensity).toString() }));
        }
      } catch (error) {
        console.error('Population density auto-fill error:', error);
      }
    }, 2000); // Delay to avoid rate limiting

    return () => clearTimeout(timeoutId);
  }, [mapLocation.lat, mapLocation.lng]); // Don't include vData to avoid infinite loops

  // Auto-fill rainfall intensity from Open-Meteo API
  useEffect(() => {
    const timeoutId = setTimeout(async () => {
      try {
        // Use Open-Meteo API for current and recent precipitation data
        const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${mapLocation.lat}&longitude=${mapLocation.lng}&current=precipitation&hourly=precipitation&past_days=7&forecast_days=1`;

        const response = await fetch(weatherUrl);
        const data = await response.json();

        if (data.current && data.hourly) {
          // Get current precipitation (mm/hr)
          let rainfallIntensity = data.current.precipitation || 0;

          // If no current precipitation, look at recent historical max (past 7 days)
          // This gives us a sense of recent intense rainfall events
          if (rainfallIntensity === 0 && data.hourly.precipitation) {
            const recentPrecip = data.hourly.precipitation.slice(-168); // Last 7 days (168 hours)
            const maxRecent = Math.max(...recentPrecip.filter((p: number) => p !== null));

            if (maxRecent > 0) {
              rainfallIntensity = maxRecent;
            }
          }

          // Auto-fill only if field is empty (allow user override)
          if (!hData.rainfall_intensity && rainfallIntensity > 0) {
            setHData(prev => ({ ...prev, rainfall_intensity: rainfallIntensity.toFixed(1) }));
          }
        }
      } catch (error) {
        console.error('Rainfall auto-fill error:', error);
      }
    }, 2500); // Delay to avoid rate limiting

    return () => clearTimeout(timeoutId);
  }, [mapLocation.lat, mapLocation.lng]); // Don't include hData to avoid infinite loops

  // Check API connection on mount
  useEffect(() => {
    const checkConnection = async () => {
      setIsCheckingAPI(true);
      try {
        const connected = await checkAPIConnection();
        setIsAPIConnected(connected);
        if (connected) {
          console.log('✅ Backend API connected successfully');
        } else {
          console.warn('⚠️ Backend API connection failed');
          toast.warning('Backend API is not connected. Data will not be persisted.');
        }
      } catch (error) {
        console.error('API connection check failed:', error);
        setIsAPIConnected(false);
      } finally {
        setIsCheckingAPI(false);
      }
    };

    checkConnection();
  }, []);

  // Load local lore entries from backend on mount
  useEffect(() => {
    if (!isAPIConnected) return;

    const loadLocalLoreEntries = async () => {
      setIsLoadingLoreEntries(true);
      try {
        const response = await lFactorAPI.getAll();
        const entries: LocalLoreEntry[] = response.events.map((e: any) => ({
          id: e.id,
          eventType: e.eventType,
          recency: e.recency || 0,
          location: e.location,
          description: e.description,
          source: e.source,
          credibility: e.credibility,
          spatialAccuracy: e.spatialAccuracy,
          createdAt: e.created_at ? new Date(e.created_at) : undefined,
          lastModified: e.created_at ? new Date(e.created_at) : undefined
        }));

        setLocalLoreEntries(entries);

        // Update Local Lore status if we have events
        if (entries.length > 0) {
          setLocalLoreData(prev => prev.map(item =>
            item.id === 'local-lore-entries' ? { ...item, status: 'uploaded' as const } : item
          ));
        }

        console.log(`Loaded ${entries.length} L Factor stories from database`);
      } catch (error) {
        // Silently fail - table may not exist yet, entries will populate as user adds them
        console.log('No existing local lore entries found (this is normal for new installations)');
      } finally {
        setIsLoadingLoreEntries(false);
      }
    };

    loadLocalLoreEntries();
  }, [isAPIConnected]);

  // Load data sources from backend on mount
  useEffect(() => {
    if (!isAPIConnected) return;

    const loadDataSources = async () => {
      try {
        const response = await dataSourceAPI.getAll();
        const sources: DataSource[] = response.data_sources;

        // Update each category with data from database
        sources.forEach(source => {
          const dataItem: Partial<DataItem> = {
            status: source.status,
            currentVersion: source.current_version || 0,
            lastUpdated: source.last_updated ? new Date(source.last_updated) : undefined,
          };

          // Update the appropriate state based on factor category
          if (source.factor_category === 'H') {
            setEventDriversData(prev => prev.map(item =>
              item.id === source.item_id ? { ...item, ...dataItem } : item
            ));
          } else if (source.factor_category === 'L') {
            setLocalLoreData(prev => prev.map(item =>
              item.id === source.item_id ? { ...item, ...dataItem } : item
            ));
          } else if (source.factor_category === 'V') {
            setVulnerabilityData(prev => prev.map(item =>
              item.id === source.item_id ? { ...item, ...dataItem } : item
            ));
          }
        });

        console.log(`Loaded ${sources.length} data sources from database`);
      } catch (error) {
        console.error('Failed to load data sources:', error);
        // Don't show error toast as data sources might not exist yet
      }
    };

    loadDataSources();
  }, [isAPIConnected]);

  // Helper function to format coordinates
  const formatCoordinates = (lat: number, lng: number) => {
    const latDir = lat >= 0 ? 'N' : 'S';
    const lngDir = lng >= 0 ? 'E' : 'W';
    const latDeg = Math.floor(Math.abs(lat));
    const latMin = Math.floor((Math.abs(lat) - latDeg) * 60);
    const lngDeg = Math.floor(Math.abs(lng));
    const lngMin = Math.floor((Math.abs(lng) - lngDeg) * 60);
    return `${latDeg}°${latMin}'${latDir}, ${lngDeg}°${lngMin}'${lngDir}`;
  };

  // Handle Start Assessment button click
  const handleStartAssessment = async () => {
    try {
      setIsStartingAssessment(true);

      // Validate required fields
      if (!selectedEventType) {
        toast.error('Please select an event type');
        return;
      }
      if (!dateObserved) {
        toast.error('Please select a date assessed');
        return;
      }

      // Create or get location for current coordinates
      let locationId: number;

      try {
        // Create a new location with current coordinates
        const locationResult = await locationAPI.create({
          name: locationName || `Location at ${formatCoordinates(mapLocation.lat, mapLocation.lng)}`,
          latitude: mapLocation.lat,
          longitude: mapLocation.lng,
          description: `Assessment location for ${selectedEventType}`,
          region: locationName
        });
        locationId = locationResult.location_id;
      } catch (error: any) {
        // If location already exists (409 conflict), we could fetch all locations and find matching one
        // For now, let's use a default location_id of 1 or handle the error
        console.warn('Location creation warning:', error);
        // Try to use location_id = 1 as fallback
        locationId = 1;
      }

      // Create event in database
      const eventResult = await eventAPI.create({
        location_id: locationId,
        hazard_type: selectedEventType,
        date_observed: dateObserved
      });

      setCurrentEventId(eventResult.event_id);
      toast.success(`Assessment started! Event ID: ${eventResult.event_id}`);

    } catch (error: any) {
      console.error('Start assessment error:', error);
      const errorMessage = getErrorMessage(error);
      toast.error(errorMessage || 'Failed to start assessment. Please check your connection and try again.');
    } finally {
      setIsStartingAssessment(false);
    }
  };

  // Handle H Factor Submit Data button
  const handleSubmitHData = async () => {
    try {
      setIsSubmittingH(true);

      // Validate required H factor inputs
      if (!hData.slope_avg) {
        toast.error('H Factor: Slope is required');
        return;
      }
      if (!hData.curvature) {
        toast.error('H Factor: Curvature is required');
        return;
      }
      if (!hData.rock_type) {
        toast.error('H Factor: Lithology class is required');
        return;
      }
      if (!hData.rain_exceed) {
        toast.error('H Factor: Rainfall exceedance probability is required');
        return;
      }

      // Parse lithology class into type and level
      const lithologyLevel = parseInt(hData.rock_type);
      let lithologyType = '';
      if (lithologyLevel <= 2) {
        lithologyType = 'igneous';
      } else if (lithologyLevel <= 4) {
        lithologyType = 'sedimentary';
      } else {
        lithologyType = 'weathered';
      }

      // Prepare data for API submission
      const submissionData = {
        // Location data
        location_name: locationName,
        latitude: mapLocation.lat,
        longitude: mapLocation.lng,
        location_description: `H Factor data collected on ${new Date().toLocaleDateString()}`,
        region: '',

        // Event data
        hazard_type: 'landslide',
        date_observed: dateObserved || new Date().toISOString().split('T')[0],

        // H Factor - Terrain data (for event table)
        slope_angle: parseFloat(hData.slope_avg),
        curvature_number: parseFloat(hData.curvature),
        lithology_type: lithologyType,
        lithology_level: lithologyLevel,

        // H Factor - Rainfall data (for dynamic_trigger table)
        rainfall_intensity_mm_hr: hData.rainfall_intensity ? parseFloat(hData.rainfall_intensity) : undefined,
        rainfall_duration_hrs: hData.rainfall_duration ? parseFloat(hData.rainfall_duration) : undefined,
        rainfall_exceedance: parseFloat(hData.rain_exceed),
      };

      // Submit to database via API
      const response = await hFactorAPI.submit(submissionData);

      // Save to localStorage for persistence
      localStorage.setItem('georiskmod_h_data', JSON.stringify(hData));

      setHDataSaved(true);
      toast.success(`H Factor data saved to database! Event ID: ${response.event_id}`);

    } catch (error: any) {
      console.error('H Factor submit error:', error);
      toast.error(`Failed to save H Factor data: ${error.message || 'Unknown error'}`);
    } finally {
      setIsSubmittingH(false);
    }
  };

  // Handle L Factor Submit Data button
  const handleSubmitLData = async () => {
    try {
      setIsSubmittingL(true);

      // For L Factor, we just validate that some data has been entered
      // The actual submission happens through the lore API in the L Factor forms

      // Save indicator to localStorage
      localStorage.setItem('georiskmod_l_data_saved', 'true');

      setLDataSaved(true);
      toast.success('L Factor data saved successfully!');

    } catch (error: any) {
      console.error('L Factor submit error:', error);
      toast.error('Failed to save L Factor data');
    } finally {
      setIsSubmittingL(false);
    }
  };

  // Handle V Factor Submit Data button
  const handleSubmitVData = async () => {
    try {
      setIsSubmittingV(true);

      // Validate required V factor inputs
      if (!vData.exposure) {
        toast.error('V Factor: Exposure score is required');
        return;
      }
      if (!vData.fragility) {
        toast.error('V Factor: Fragility score is required');
        return;
      }

      // Prepare data for API submission
      const submissionData = {
        // Location data
        location_name: locationName,
        latitude: mapLocation.lat,
        longitude: mapLocation.lng,
        location_description: `V Factor data collected on ${new Date().toLocaleDateString()}`,
        region: '',

        // V Factor data
        exposure_score: parseFloat(vData.exposure),
        fragility_score: parseFloat(vData.fragility),
        criticality_score: vData.criticality_weight ? parseFloat(vData.criticality_weight) : undefined,
        population_density: vData.population_density ? parseFloat(vData.population_density) : undefined,
      };

      // Submit to database via API
      const response = await vFactorAPI.submit(submissionData);

      // Save to localStorage for persistence
      localStorage.setItem('georiskmod_v_data', JSON.stringify(vData));

      setVDataSaved(true);
      toast.success(`V Factor data saved to database! Vulnerability ID: ${response.vulnerability_id}`);

    } catch (error: any) {
      console.error('V Factor submit error:', error);
      toast.error(`Failed to save V Factor data: ${error.message || 'Unknown error'}`);
    } finally {
      setIsSubmittingV(false);
    }
  };

  // Handle Calculate Risk button click
  const handleCalculateRisk = async () => {
    try {
      setIsCalculating(true);

      // Validate required fields
      if (!selectedEventType) {
        toast.error('Please select an event type');
        return;
      }
      if (!dateObserved) {
        toast.error('Please select a date observed');
        return;
      }

      // Validate H factor inputs
      if (!hData.slope_avg) {
        toast.error('H Factor: Slope is required');
        return;
      }
      if (!hData.curvature) {
        toast.error('H Factor: Curvature is required');
        return;
      }
      if (!hData.rock_type) {
        toast.error('H Factor: Lithology class is required');
        return;
      }
      if (!hData.rain_exceed) {
        toast.error('H Factor: Rainfall exceedance probability is required');
        return;
      }

      // Validate V factor inputs
      if (!vData.exposure) {
        toast.error('V Factor: Exposure score is required');
        return;
      }
      if (!vData.fragility) {
        toast.error('V Factor: Fragility score is required');
        return;
      }

      // Prepare request body
      const requestData = {
        // H Factor
        slope_deg: parseFloat(hData.slope_avg),
        curvature: parseFloat(hData.curvature),
        lith_class: parseInt(hData.rock_type), // 1-5 scale
        rain_exceed: parseFloat(hData.rain_exceed), // 0-1

        // L Factor (default to 0 if no lore data)
        lore_signal: 0.0,

        // V Factor
        exposure: parseFloat(vData.exposure), // 0-1
        fragility: parseFloat(vData.fragility), // 0-1

        // Metadata
        event_type: selectedEventType,
        location_lat: mapLocation.lat,
        location_lng: mapLocation.lng,
        date_observed: dateObserved
      };

      // Call API endpoint using the API service
      const result = await riskCalculationAPI.calculate(requestData);
      setRiskResults(result.data);

      // Notify parent component of risk calculation
      if (onRiskCalculated) {
        onRiskCalculated(result.data);
      }

      toast.success(`Risk calculated successfully! Risk Level: ${result.data.risk_level}`);
    } catch (error: any) {
      console.error('Risk calculation error:', error);
      const errorMessage = getErrorMessage(error);
      toast.error(errorMessage || 'Failed to calculate risk. Please check your connection and try again.');
    } finally {
      setIsCalculating(false);
    }
  };

  // Render completeness indicator

  // Render completeness indicator (defensive)
  const renderCompleteness = (completed: number = 0, total: number = 0) => {
    const safeTotal = Math.max(0, Math.floor(Number(total) || 0));
    const safeCompleted = Math.max(0, Math.min(Math.floor(Number(completed) || 0), safeTotal));

    const circles = Array.from({ length: safeTotal }, (_, i) => (
      <div
        key={i}
        aria-hidden
        className={`w-4 h-4 rounded-full ${i < safeCompleted ? 'bg-green-500' : 'bg-gray-600'}`}
      />
    ));

    return (
      <div className="flex gap-1" aria-label={`Completeness: ${safeCompleted} of ${safeTotal}`}>
        {circles}
      </div>
    );
  };

  // Render quality indicator
  const renderQualityIndicator = (quality: { percentage: number; status: 'excellent' | 'good' | 'fair' | 'poor' }) => {
    const getStatusColor = (status: string) => {
      switch (status) {
        case 'excellent': return 'text-green-400 bg-green-950 border-green-600';
        case 'good': return 'text-blue-400 bg-blue-950 border-blue-600';
        case 'fair': return 'text-yellow-400 bg-yellow-950 border-yellow-600';
        case 'poor': return 'text-red-400 bg-red-950 border-red-600';
        default: return 'text-white bg-gray-800 border-gray-600';
      }
    };

    const getStatusIcon = (status: string) => {
      switch (status) {
        case 'excellent': return <ShieldCheck className="h-4 w-4" />;
        case 'good': return <ShieldCheck className="h-4 w-4" />;
        case 'fair': return <ShieldAlert className="h-4 w-4" />;
        case 'poor': return <ShieldX className="h-4 w-4" />;
        default: return <ShieldX className="h-4 w-4" />;
      }
    };

    return (
      <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full border ${getStatusColor(quality.status)}`}>
        {getStatusIcon(quality.status)}
        <span className="text-sm font-medium capitalize">{quality.status}</span>
        <span className="text-base">({Math.round(quality.percentage)}%)</span>
      </div>
    );
  };

  // Render detailed H Factor data entry forms - focused on risk calculation needs
  const renderHFactorForm = () => {
    return (
      <Card className="p-6">
        <div className="space-y-6">
          <div>
            <Label className="text-gray-900 mb-2 block">Slope (degrees)</Label>
            <Input
              type="number"
              step="0.1"
              value={hData.slope_avg}
              onChange={(e) => setHData({...hData, slope_avg: e.target.value})}
              placeholder="e.g., 25 (typical range: 0-60)"
              className="bg-gray-100 border-gray-300 text-gray-900"
            />
            <p className="text-xs text-gray-700 mt-1">Average slope angle. Steeper slopes increase landslide susceptibility. (Auto-filled from elevation data, editable)</p>
          </div>

          <div>
            <Label className="text-gray-900 mb-2 block">Curvature (1/m)</Label>
            <Input
              type="number"
              step="0.01"
              value={hData.curvature}
              onChange={(e) => setHData({...hData, curvature: e.target.value})}
              placeholder="e.g., -0.5 (concave)"
              className="bg-gray-100 border-gray-300 text-gray-900"
            />
            <p className="text-xs text-gray-700 mt-1">Terrain curvature. Negative (concave) areas accumulate water and increase risk. (Auto-filled from elevation data, editable)</p>
          </div>

          <div>
            <Label className="text-gray-900 mb-2 block">Lithology Class (1-5)</Label>
            <Select
              value={hData.rock_type}
              onValueChange={(val) => setHData({...hData, rock_type: val})}
            >
              <SelectTrigger className="bg-gray-100 border-gray-300 text-gray-900">
                <SelectValue placeholder="Select erodibility class" />
              </SelectTrigger>
              <SelectContent className="bg-white border-gray-300 text-gray-900">
                <SelectItem value="1">1 - Hardest (fresh granite, basalt)</SelectItem>
                <SelectItem value="2">2 - Hard (slightly weathered igneous)</SelectItem>
                <SelectItem value="3">3 - Medium (sandstone, moderately weathered)</SelectItem>
                <SelectItem value="4">4 - Soft (shale, highly weathered)</SelectItem>
                <SelectItem value="5">5 - Very Soft (completely weathered, soil-like)</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-gray-700 mt-1">Rock and soil erodibility classification. Higher values indicate more susceptible materials.</p>
          </div>

          <div>
            <Label className="text-gray-900 mb-2 block">Rainfall Intensity (mm/hr)</Label>
            <Input
              type="number"
              step="0.1"
              value={hData.rainfall_intensity}
              onChange={(e) => setHData({...hData, rainfall_intensity: e.target.value})}
              placeholder="e.g., 50"
              className="bg-gray-100 border-gray-300 text-gray-900"
            />
            <p className="text-xs text-gray-700 mt-1">Hourly rainfall rate that triggered or may trigger the loreEntry. (Auto-filled from Open-Meteo weather data, editable)</p>
          </div>

          <div>
            <Label className="text-gray-900 mb-2 block">Duration (hours)</Label>
            <Input
              type="number"
              step="0.1"
              value={hData.rainfall_duration}
              onChange={(e) => setHData({...hData, rainfall_duration: e.target.value})}
              placeholder="e.g., 24"
              className="bg-gray-100 border-gray-300 text-gray-900"
            />
            <p className="text-xs text-gray-700 mt-1">Length of time the rainfall intensity persists.</p>
          </div>

          <div>
            <Label className="text-gray-900 mb-2 block">Exceedance Probability (0-1)</Label>
            <Input
              type="number"
              step="0.01"
              min="0"
              max="1"
              value={hData.rain_exceed || ''}
              onChange={(e) => setHData({...hData, rain_exceed: e.target.value})}
              placeholder="e.g., 0.8 (high probability)"
              className="bg-gray-100 border-gray-300 text-gray-900"
            />
            <p className="text-xs text-gray-700 mt-1">Probability that this rainfall event will be exceeded. Higher values = more extreme events.</p>
          </div>
        </div>
      </Card>
    );
  };

  // Render detailed V Factor data entry forms - focused on risk calculation needs
  const renderVFactorForm = () => {
    return (
      <Card className="p-6">
             <div className="space-y-6">
          <div>
            <Label className="text-gray-900 mb-2 block">Exposure Score (0-1)</Label>
            <Input
              type="number"
              step="0.01"
              min="0"
              max="1"
              value={vData.exposure}
              onChange={(e) => setVData({...vData, exposure: e.target.value})}
              placeholder="e.g., 0.75"
              className="bg-gray-100 border-gray-300 text-gray-900"
            />
            <p className="text-xs text-gray-700 mt-1">Measure of people, buildings, and infrastructure at risk in the area (0=none, 1=maximum).</p>
          </div>

          <div>
            <Label className="text-gray-900 mb-2 block">Fragility Score (0-1)</Label>
            <Input
              type="number"
              step="0.01"
              min="0"
              max="1"
              value={vData.fragility}
              onChange={(e) => setVData({...vData, fragility: e.target.value})}
              placeholder="e.g., 0.60"
              className="bg-gray-100 border-gray-300 text-gray-900"
            />
            <p className="text-xs text-gray-700 mt-1">Susceptibility of structures to damage from the hazard (0=resilient, 1=highly susceptible).</p>
          </div>

          <div>
            <Label className="text-gray-900 mb-2 block">Criticality Score (0-1)</Label>
            <Input
              type="number"
              step="0.01"
              min="0"
              max="1"
              value={vData.criticality_weight}
              onChange={(e) => setVData({...vData, criticality_weight: e.target.value})}
              placeholder="e.g., 0.8 for hospital, 0.3 for warehouse"
              className="bg-gray-100 border-gray-300 text-gray-900"
            />
            <p className="text-xs text-gray-700 mt-1">Importance of assets in the area based on societal function (0=low importance, 1=critical infrastructure like hospitals, schools, emergency services).</p>
          </div>

          <div>
            <Label className="text-gray-900 mb-2 block">Population Density (people/km²)</Label>
            <Input
              type="number"
              step="0.1"
              value={vData.population_density}
              onChange={(e) => setVData({...vData, population_density: e.target.value})}
              placeholder="e.g., 250"
              className="bg-gray-100 border-gray-300 text-gray-900"
            />
            <p className="text-xs text-gray-700 mt-1">Number of people per square kilometer in the affected area. (Auto-filled from OpenStreetMap, editable)</p>
          </div>
        </div>
      </Card>
    );
  };

  // Render data item
  const renderDataItem = (item: DataItem, dataType: 'H' | 'L' | 'V') => {
    return (
      <div key={item.id} className="bg-slate-700 rounded-lg p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-start gap-3 flex-1">
            <div className="mt-1 text-blue-400">
              {item.icon}
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <h4 className="font-medium text-white">{item.name}</h4>
                {item.status === 'uploaded' && (
                  <Badge className="bg-green-600 hover:bg-green-700 text-sm">
                    <CheckCircle2 className="h-3 w-3 mr-1" />
                    Uploaded
                  </Badge>
                )}
                {item.status === 'connected' && (
                  <Badge className="bg-blue-600 hover:bg-blue-700 text-sm">
                    <Globe className="h-3 w-3 mr-1" />
                    Connected
                  </Badge>
                )}
                {item.status === 'missing' && (
                  <Badge variant="outline" className="text-white border-gray-600 text-sm">
                    <Circle className="h-3 w-3 mr-1" />
                    Missing
                  </Badge>
                )}
              </div>
              <p className="text-base text-white">{item.description}</p>
              {item.fileType && (
                <p className="text-base text-white mt-1">Formats: {item.fileType}</p>
              )}
            </div>
          </div>
        </div>

        <div className="flex gap-2">
          {(item.status === 'uploaded' || item.status === 'connected') && item.versions && item.versions.length > 0 && (
            <Button
              size="sm"
              variant="outline"
              className="bg-purple-600 border-purple-500 text-white hover:bg-purple-500"
              onClick={() => {
                setVersionItem(item);
                setShowVersionDialog(true);
              }}
            >
              <History className="h-3 w-3 mr-2" />
              History
            </Button>
          )}
          <Button
            size="sm"
            variant="outline"
            className="flex-1 bg-slate-600 border-slate-500 text-white hover:bg-slate-500"
            onClick={() => handleFileUpload(item.id, dataType)}
          >
            <Upload className="h-3 w-3 mr-2" />
            Upload File
          </Button>
          {/* Show Process button for DEM after upload */}
          {item.id === 'dem' && item.status === 'uploaded' && (
            <Button
              size="sm"
              variant="outline"
              className="flex-1 bg-blue-600 border-blue-500 text-white hover:bg-blue-500"
              onClick={() => handleProcessDEM(item.id)}
            >
              <Database className="h-3 w-3 mr-2" />
              Process DEM
            </Button>
          )}
          {item.apiService && (
            <Button
              size="sm"
              variant="outline"
              className="flex-1 bg-slate-600 border-slate-500 text-white hover:bg-slate-500"
              onClick={() => handleConnectAPI(item.id, dataType)}
            >
              <Globe className="h-3 w-3 mr-2" />
              Connect to {item.apiService}
            </Button>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="flex-1 bg-gray-900 text-white p-6 overflow-auto">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex justify-between items-start mb-6">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-4">
              <h1 className="text-3xl font-bold text-white">
                Data Management
              </h1>
              {/* API Connection Status Indicator */}
              {isCheckingAPI ? (
                <div className="flex items-center gap-2 px-3 py-1 bg-gray-700 rounded-full text-sm">
                  <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-blue-400"></div>
                  <span className="text-white">Checking connection...</span>
                </div>
              ) : isAPIConnected ? (
                <div className="flex items-center gap-2 px-3 py-1 bg-green-900 rounded-full text-sm">
                  <Wifi className="h-3 w-3 text-green-400" />
                  <span className="text-green-300">Backend Connected</span>
                </div>
              ) : (
                <div className="flex items-center gap-2 px-3 py-1 bg-red-900 rounded-full text-sm">
                  <WifiOff className="h-3 w-3 text-red-400" />
                  <span className="text-red-300">Backend Offline</span>
                </div>
              )}
            </div>
            <p className="text-white text-base mb-4">
              The Borromean Risk model requires three types of data. All three must be present to calculate actionable risk.
            </p>

            {/* Location and Event Information */}
            <div className="flex gap-4 items-start">
              {/* Location Information Box */}
              <div className="p-3 bg-slate-800 rounded-lg flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <MapPin className="h-4 w-4 text-blue-400" />
                  <span className="text-sm font-medium text-white">Current Location</span>
                  {isLoadingLocation && (
                    <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-blue-400 ml-auto"></div>
                  )}
                </div>
                <div className="text-base text-white space-y-1">
                  <div className="flex items-start gap-1">
                    <span className="text-white">Address:</span>
                    <span className="flex-1">{locationName}</span>
                  </div>
                  <div>
                    <span className="text-white">Coordinates:</span> {formatCoordinates(mapLocation.lat, mapLocation.lng)}
                  </div>
                  <div>
                    <span className="text-white">Elevation:</span> {elevation !== null ? `${elevation}m` : 'Loading...'}
                  </div>
                </div>
              </div>

              {/* Event Type Selection */}
              <div className="flex-1">
                <Label htmlFor="event-type" className="text-white mb-2 block">Event Type</Label>
                <Select value={selectedEventType} onValueChange={setSelectedEventType}>
                  <SelectTrigger id="event-type" className="bg-gray-100 border-gray-300 text-gray-900 h-11">
                    <SelectValue placeholder="Select Event Type" />
                  </SelectTrigger>
                  <SelectContent className="bg-white border-gray-300 text-gray-900">
                    <SelectItem value="landslide">Landslide</SelectItem>
                    <SelectItem value="rockfall">Rockfall</SelectItem>
                    <SelectItem value="debris_flow">Debris Flow</SelectItem>
                    <SelectItem value="mudflow">Mudflow</SelectItem>
                    <SelectItem value="lava_flow">Lava Flow</SelectItem>
                  </SelectContent>
                </Select>

                {/* Start Assessment Button */}
                <Button
                  className="bg-blue-600 hover:bg-blue-700 mt-3 w-full"
                  onClick={handleStartAssessment}
                  disabled={isStartingAssessment}
                >
                  {isStartingAssessment ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      Starting...
                    </>
                  ) : (
                    'Start Assessment'
                  )}
                </Button>
                {currentEventId && (
                  <p className="text-xs text-green-400 mt-1">Event ID: {currentEventId}</p>
                )}
              </div>

              {/* Date Assessed Field */}
              <div className="flex-1">
                <Label htmlFor="date-observed" className="text-white mb-2 block">Date Assessed</Label>
                <Input
                  id="date-observed"
                  type="date"
                  value={dateObserved}
                  onChange={(e) => setDateObserved(e.target.value)}
                  className="bg-gray-100 border-gray-300 text-gray-900 h-11"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Risk Calculation Results */}
        {riskResults && (
          <div className="bg-slate-800 p-6 mt-6 rounded-lg">
            {/* White card with colored header */}
            <Card className="bg-white border-0 overflow-hidden">
              {/* Header with risk level color - 4-tier system */}
              <div
                className="py-4 px-6"
                style={{
                  backgroundColor:
                    riskResults.R_score >= 0.80 ? '#D00000' : // Severe - Red
                    riskResults.R_score >= 0.60 ? '#FF9F1C' : // High - Orange
                    riskResults.R_score >= 0.30 ? '#FFD60A' : // Medium - Yellow
                    '#2D6A4F' // Low - Green
                }}
              >
                <div className="flex items-center gap-3">
                  <BarChart3 className="h-6 w-6 text-white" />
                  <h3 className="text-xl font-bold text-white">Risk Assessment Results</h3>
                </div>
              </div>

              {/* Content - Compact Layout */}
              <div className="p-6">
                <div className="flex gap-6">
                  {/* Left Section - Progress Bars (Half Width) */}
                  <div className="flex-none w-[45%] space-y-3">
                    {/* Overall Risk Score */}
                    <div>
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-gray-700 text-sm font-medium">Overall Risk</span>
                        <div className="flex items-center gap-1.5">
                          <span className="text-gray-900 font-semibold text-sm">
                            {(riskResults.R_score * 100).toFixed(1)}%
                          </span>
                          <span className="text-xs text-gray-500">
                            ±{(riskResults.R_std * 100).toFixed(1)}%
                          </span>
                        </div>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="h-2 rounded-full transition-all duration-500"
                          style={{
                            width: `${riskResults.R_score * 100}%`,
                            backgroundColor:
                              riskResults.R_score >= 0.80 ? '#D00000' : // Severe - Red
                              riskResults.R_score >= 0.60 ? '#FF9F1C' : // High - Orange
                              riskResults.R_score >= 0.30 ? '#FFD60A' : // Medium - Yellow
                              '#2D6A4F' // Low - Green
                          }}
                        />
                      </div>
                    </div>

                    {/* H Factor */}
                    <div>
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-gray-700 text-sm font-medium">H - Event Drivers</span>
                        <span className="text-gray-900 font-semibold text-sm">{(riskResults.H_score * 100).toFixed(1)}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="h-2 rounded-full transition-all duration-500"
                          style={{width: `${riskResults.H_score * 100}%`, backgroundColor: '#263ef7'}}
                        />
                      </div>
                    </div>

                    {/* L Factor */}
                    <div>
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-gray-700 text-sm font-medium">L - Local Lore</span>
                        <span className="text-gray-900 font-semibold text-sm">{(riskResults.L_score * 100).toFixed(1)}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="h-2 rounded-full transition-all duration-500"
                          style={{width: `${riskResults.L_score * 100}%`, backgroundColor: '#30a6ec'}}
                        />
                      </div>
                    </div>

                    {/* V Factor */}
                    <div>
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-gray-700 text-sm font-medium">V - Vulnerability</span>
                        <span className="text-gray-900 font-semibold text-sm">{(riskResults.V_score * 100).toFixed(1)}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="h-2 rounded-full transition-all duration-500"
                          style={{width: `${riskResults.V_score * 100}%`, backgroundColor: '#9c2fee'}}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Right Section - Information Grid */}
                  <div className="flex-1 grid grid-cols-2 gap-x-6 gap-y-3 content-start">
                    {/* Gate Status */}
                    <div>
                      <div className="text-xs text-gray-500 mb-1">Gate Status</div>
                      <div className="text-sm font-semibold">
                        {riskResults.gate_passed ?
                          <span className="text-green-600">Passed</span> :
                          <span className="text-red-600">Failed</span>
                        }
                      </div>
                    </div>

                    {/* Event Type */}
                    <div>
                      <div className="text-xs text-gray-500 mb-1">Event Type</div>
                      <div className="text-sm font-semibold text-gray-900 capitalize">{riskResults.config.hazard_type}</div>
                    </div>

                    {/* H Threshold */}
                    <div>
                      <div className="text-xs text-gray-500 mb-1">H Threshold</div>
                      <div className="text-sm font-semibold text-gray-900">{riskResults.config.tau_H}</div>
                    </div>

                    {/* L Threshold */}
                    <div>
                      <div className="text-xs text-gray-500 mb-1">L Threshold</div>
                      <div className="text-sm font-semibold text-gray-900">{riskResults.config.tau_L}</div>
                    </div>

                    {/* V Threshold */}
                    <div>
                      <div className="text-xs text-gray-500 mb-1">V Threshold</div>
                      <div className="text-sm font-semibold text-gray-900">{riskResults.config.tau_V}</div>
                    </div>

                    {/* Synergy */}
                    <div>
                      <div className="text-xs text-gray-500 mb-1">Synergy Factor</div>
                      <div className="text-sm font-semibold text-gray-900">{riskResults.config.kappa_synergy}</div>
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          </div>
        )}

        {/* Three-Card Data Entry */}
        <div className="bg-slate-800 rounded-lg p-6">
          <h2 className="text-xl font-semibold text-white mb-6 text-center">
            Borromean Risk Model - Data Entry
          </h2>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-16">
            {/* Card 1: H - Event Drivers */}
            <Card className="bg-white p-0 overflow-hidden flex flex-col" style={{maxHeight: '800px'}}>
              <div className="text-white text-center py-3" style={{backgroundColor: '#263ef7'}}>
                <h3 className="font-semibold">H - Event Drivers</h3>
                <p className="text-xs mt-1">Physical factors that trigger mass movements</p>
              </div>

              <div className="p-6 overflow-y-auto flex-1">
                {renderHFactorForm()}
              </div>

              {/* Submit H Data Button */}
              <div className="p-4 border-t border-gray-200">
                <Button
                  className="bg-blue-600 hover:bg-blue-700 w-full"
                  onClick={handleSubmitHData}
                  disabled={isSubmittingH}
                >
                  {isSubmittingH ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    <>
                      <Database className="h-4 w-4 mr-2" />
                      Submit Data
                    </>
                  )}
                </Button>
                {hDataSaved && (
                  <p className="text-xs text-green-600 mt-2 text-center flex items-center justify-center gap-1">
                    <CheckCircle2 className="h-3 w-3" />
                    Data saved
                  </p>
                )}
              </div>
            </Card>

            {/* Card 2: L - Local Lore & History */}
            <Card className="bg-white p-0 overflow-hidden flex flex-col" style={{maxHeight: '800px'}}>
              <div className="text-white text-center py-3" style={{backgroundColor: '#30a6ec'}}>
                <h3 className="font-semibold">L - Local Lore & History</h3>
                <p className="text-xs mt-1">Place-based evidence and local lore entries</p>
              </div>

              <div className="p-6 overflow-y-auto flex-1">
                {/* Three Scenario Tabs */}
                <div className="grid grid-cols-3 gap-2 mb-6">
                  <Button
                    variant={loreScenario === 'story' ? 'default' : 'outline'}
                    onClick={() => setLoreScenario('story')}
                    className={loreScenario === 'story'
                      ? 'bg-gray-900 hover:bg-gray-950 text-white text-xs py-2'
                      : 'bg-gray-200 border-gray-300 text-gray-700 hover:bg-gray-300 text-xs py-2'}
                    size="sm"
                  >
                    <BookOpen className="h-3 w-3 mr-1" />
                    Story
                  </Button>
                  <Button
                    variant={loreScenario === 'discover' ? 'default' : 'outline'}
                    onClick={() => setLoreScenario('discover')}
                    className={loreScenario === 'discover'
                      ? 'bg-gray-900 hover:bg-gray-950 text-white text-xs py-2'
                      : 'bg-gray-200 border-gray-300 text-gray-700 hover:bg-gray-300 text-xs py-2'}
                    size="sm"
                  >
                    <Search className="h-3 w-3 mr-1" />
                    Discover
                  </Button>
                  <Button
                    variant={loreScenario === 'observation' ? 'default' : 'outline'}
                    onClick={() => setLoreScenario('observation')}
                    className={loreScenario === 'observation'
                      ? 'bg-gray-900 hover:bg-gray-950 text-white text-xs py-2'
                      : 'bg-gray-200 border-gray-300 text-gray-700 hover:bg-gray-300 text-xs py-2'}
                    size="sm"
                  >
                    <Eye className="h-3 w-3 mr-1" />
                    Observe
                  </Button>
                </div>

                    {/* Scenario 1: Submit Story/Lore */}
                    {loreScenario === 'story' && (
                      <Card className="bg-white border-gray-200 p-6">
                        <div className="mb-4">
                          <h4 className="text-md font-semibold text-gray-900 mb-2">Submit Story/Lore</h4>
                          <p className="text-sm text-gray-700">
                            Provide a story or lore (text or file). Our AI agent will analyze it to extract recency, spatial information, and credibility.
                          </p>
                        </div>

                        <div className="space-y-6">
                          <div>
                            <Label htmlFor="story-title" className="text-gray-900 mb-2 block">Title *</Label>
                            <Input
                              id="story-title"
                              placeholder="e.g., Old logging road landslide"
                              value={storyForm.title}
                              onChange={(e) => setStoryForm({...storyForm, title: e.target.value})}
                              className="bg-gray-100 border-gray-300 text-gray-900"
                            />
                          </div>

                          <div>
                            <Label htmlFor="story-text" className="text-gray-900 mb-2 block">Story/Lore *</Label>
                            <Textarea
                              id="story-text"
                              placeholder="Tell the story... e.g., My grandfather told me about a massive landslide in 1952..."
                              value={storyForm.story_text}
                              onChange={(e) => setStoryForm({...storyForm, story_text: e.target.value})}
                              className="bg-gray-100 border-gray-300 text-gray-900 min-h-[400px]"
                            />
                          </div>

                          <div>
                            <Label htmlFor="story-location" className="text-gray-900 mb-2 block">Location Context (Optional)</Label>
                            <Input
                              id="story-location"
                              placeholder="e.g., Near Eagle Creek, Mt. Hood area"
                              value={storyForm.location_description}
                              onChange={(e) => setStoryForm({...storyForm, location_description: e.target.value})}
                              className="bg-gray-100 border-gray-300 text-gray-900"
                            />
                            <p className="text-xs text-gray-700 mt-1">Additional location context to help AI extract spatial information</p>
                          </div>

                          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                            <div className="flex items-start gap-2">
                              <Sparkles className="h-5 w-5 text-blue-600 mt-0.5" />
                              <div>
                                <h5 className="font-semibold text-blue-900 mb-1">AI Will Extract Automatically:</h5>
                                <ul className="text-sm text-blue-800 space-y-1">
                                  <li>• <strong>Recency</strong> - When the event occurred (years ago)</li>
                                  <li>• <strong>Credibility</strong> - Source reliability (oral tradition, historical, scientific)</li>
                                  <li>• <strong>Spatial Information</strong> - Location details and precision</li>
                                  <li>• <strong>Event Type</strong> - Type of mass movement (landslide, debris flow, etc.)</li>
                                </ul>
                              </div>
                            </div>
                          </div>

                          <div className="flex gap-4">
                            <Button
                              onClick={handleSubmitStory}
                              className="bg-blue-600 hover:bg-blue-700 text-white"
                              disabled={!storyForm.title || !storyForm.story_text}
                            >
                              <Sparkles className="h-4 w-4 mr-2" />
                              Submit & Analyze with AI
                            </Button>
                          </div>
                        </div>
                      </Card>
                    )}

                    {/* Scenario 2: Discover Lore */}
                    {loreScenario === 'discover' && (
                      <Card className="bg-white border-gray-200 p-6">
                        <div className="mb-4">
                          <h4 className="text-md font-semibold text-gray-900 mb-2">AI Discovers Lore at Location</h4>
                          <p className="text-sm text-gray-700">
                            AI agent searches historical databases, news archives, and indigenous knowledge repositories for lore at a given location.
                          </p>
                        </div>

                        <div className="space-y-6">
                          <div>
                            <Label htmlFor="discover-lat" className="text-gray-900 mb-2 block">Latitude *</Label>
                            <Input
                              id="discover-lat"
                              type="number"
                              step="0.0001"
                              placeholder={mapLocation.lat.toFixed(4)}
                              value={discoverForm.latitude || ''}
                              onChange={(e) => setDiscoverForm({...discoverForm, latitude: parseFloat(e.target.value)})}
                              className="bg-gray-100 border-gray-300 text-gray-900"
                            />
                          </div>

                          <div>
                            <Label htmlFor="discover-lon" className="text-gray-900 mb-2 block">Longitude *</Label>
                            <Input
                              id="discover-lon"
                              type="number"
                              step="0.0001"
                              placeholder={mapLocation.lng.toFixed(4)}
                              value={discoverForm.longitude || ''}
                              onChange={(e) => setDiscoverForm({...discoverForm, longitude: parseFloat(e.target.value)})}
                              className="bg-gray-100 border-gray-300 text-gray-900"
                            />
                          </div>

                          <div>
                            <Label htmlFor="discover-radius" className="text-gray-900 mb-2 block">Search Radius (meters)</Label>
                            <Input
                              id="discover-radius"
                              type="number"
                              placeholder="10000"
                              value={discoverForm.location_radius_m || ''}
                              onChange={(e) => setDiscoverForm({...discoverForm, location_radius_m: parseInt(e.target.value)})}
                              className="bg-gray-100 border-gray-300 text-gray-900"
                            />
                            <p className="text-xs text-gray-700 mt-1">How far to search for historical lore (default: 10 km)</p>
                          </div>

                          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                            <div className="flex items-start gap-2">
                              <Sparkles className="h-5 w-5 text-green-600 mt-0.5" />
                              <div>
                                <h5 className="font-semibold text-green-900 mb-1">AI Research Agent Will:</h5>
                                <ul className="text-sm text-green-800 space-y-1">
                                  <li>• Search historical databases for past events</li>
                                  <li>• Review news archives and reports</li>
                                  <li>• Check indigenous knowledge repositories</li>
                                  <li>• Extract recency, credibility, and spatial data automatically</li>
                                  <li>• Save all discovered lore to the database</li>
                                </ul>
                              </div>
                            </div>
                          </div>

                          <div className="flex flex-col gap-4">
                            <Button
                              variant="outline"
                              onClick={() => setDiscoverForm({
                                ...discoverForm,
                                latitude: mapLocation.lat,
                                longitude: mapLocation.lng,
                                location_radius_m: 10000
                              })}
                              className="bg-gray-200 border-gray-300 text-gray-700 hover:bg-gray-300 w-full"
                            >
                              <MapPin className="h-4 w-4 mr-2" />
                              Use Current Map Location
                            </Button>
                            <Button
                              onClick={handleDiscoverLore}
                              className="bg-blue-600 hover:bg-blue-700 text-white w-full"
                              disabled={!discoverForm.latitude || !discoverForm.longitude}
                            >
                              <Sparkles className="h-4 w-4 mr-2" />
                              Search with AI
                            </Button>
                          </div>
                        </div>
                      </Card>
                    )}

                    {/* Scenario 3: Record Observation */}
                    {loreScenario === 'observation' && (
                      <Card className="bg-white border-gray-200 p-6">
                        <div className="mb-4">
                          <h4 className="text-md font-semibold text-gray-900 mb-2">Record Field Observation</h4>
                          <p className="text-sm text-gray-700">
                            Record what you saw or heard at a location. AI agent will search for related information and assess urgency.
                          </p>
                        </div>

                        <div className="space-y-6">
                          <div>
                            <Label htmlFor="obs-title" className="text-gray-900 mb-2 block">Observation Title *</Label>
                            <Input
                              id="obs-title"
                              placeholder="e.g., Fresh scarp on hillside"
                              value={observationForm.title}
                              onChange={(e) => setObservationForm({...observationForm, title: e.target.value})}
                              className="bg-gray-100 border-gray-300 text-gray-900"
                            />
                          </div>

                          <div>
                            <Label htmlFor="obs-lat" className="text-gray-900 mb-2 block">Latitude *</Label>
                            <Input
                              id="obs-lat"
                              type="number"
                              step="0.0001"
                              placeholder={mapLocation.lat.toFixed(4)}
                              value={observationForm.latitude || ''}
                              onChange={(e) => setObservationForm({...observationForm, latitude: parseFloat(e.target.value)})}
                              className="bg-gray-100 border-gray-300 text-gray-900"
                            />
                          </div>

                          <div>
                            <Label htmlFor="obs-lon" className="text-gray-900 mb-2 block">Longitude *</Label>
                            <Input
                              id="obs-lon"
                              type="number"
                              step="0.0001"
                              placeholder={mapLocation.lng.toFixed(4)}
                              value={observationForm.longitude || ''}
                              onChange={(e) => setObservationForm({...observationForm, longitude: parseFloat(e.target.value)})}
                              className="bg-gray-100 border-gray-300 text-gray-900"
                            />
                          </div>

                          <div>
                            <Label htmlFor="obs-sight" className="text-gray-900 mb-2 block">What did you see?</Label>
                            <Textarea
                              id="obs-sight"
                              placeholder="Describe visual observations... e.g., A fresh scarp about 2 meters high with exposed soil and tilted trees"
                              value={observationForm.observation_sight}
                              onChange={(e) => setObservationForm({...observationForm, observation_sight: e.target.value})}
                              className="bg-gray-100 border-gray-300 text-gray-900 min-h-[400px]"
                            />
                          </div>

                          <div>
                            <Label htmlFor="obs-sound" className="text-gray-900 mb-2 block">What did you hear?</Label>
                            <Textarea
                              id="obs-sound"
                              placeholder="Describe auditory observations... e.g., Cracking sounds coming from the hillside"
                              value={observationForm.observation_sound}
                              onChange={(e) => setObservationForm({...observationForm, observation_sound: e.target.value})}
                              className="bg-gray-100 border-gray-300 text-gray-900 min-h-[400px]"
                            />
                          </div>

                          <div>
                            <Label htmlFor="obs-recency" className="text-gray-900 mb-2 block">Recency (years)</Label>
                            <Input
                              id="obs-recency"
                              type="number"
                              placeholder="e.g., 50"
                              value={observationForm.recency_years}
                              onChange={(e) => setObservationForm({...observationForm, recency_years: e.target.value})}
                              className="bg-gray-100 border-gray-300 text-gray-900"
                            />
                            <p className="text-xs text-gray-700 mt-1">How many years ago the event occurred</p>
                          </div>

                          <div>
                            <Label htmlFor="obs-credibility" className="text-gray-900 mb-2 block">Credibility</Label>
                            <Select
                              value={observationForm.credibility}
                              onValueChange={(value) => setObservationForm({...observationForm, credibility: value})}
                            >
                              <SelectTrigger className="bg-gray-100 border-gray-300 text-gray-900">
                                <SelectValue placeholder="Select source type" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="0.4">Oral = 0.4</SelectItem>
                                <SelectItem value="0.6">Historical = 0.6</SelectItem>
                                <SelectItem value="0.9">Scientific = 0.9</SelectItem>
                              </SelectContent>
                            </Select>
                            <p className="text-xs text-gray-700 mt-1">How reliable the information source is. Scientific or official sources have higher value</p>
                          </div>

                          <div>
                            <Label htmlFor="obs-spatial" className="text-gray-900 mb-2 block">Spatial Relevance (m)</Label>
                            <Input
                              id="obs-spatial"
                              type="number"
                              placeholder="e.g., 100"
                              value={observationForm.spatial_relevance_m}
                              onChange={(e) => setObservationForm({...observationForm, spatial_relevance_m: e.target.value})}
                              className="bg-gray-100 border-gray-300 text-gray-900"
                            />
                            <p className="text-xs text-gray-700 mt-1">Distance from reported Lore to the event</p>
                          </div>

                          <div className="flex gap-4">
                            <Button
                              onClick={handleSubmitObservation}
                              className="bg-blue-600 hover:bg-blue-700 text-white"
                              disabled={!observationForm.title || !observationForm.latitude || !observationForm.longitude}
                            >
                              <Sparkles className="h-4 w-4 mr-2" />
                              Submit & Analyze with AI
                            </Button>
                          </div>
                        </div>
                      </Card>
                    )}

                    {/* Lore Stories List - COMMENTED OUT */}
                    {/* <div className="mt-6 pt-6 border-t border-slate-600">
                      <div className="flex items-center justify-between mb-4">
                        <h4 className="text-md font-semibold text-white">Collected Lore & Stories</h4>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={loadLoreStories}
                          className="bg-slate-700 border-slate-600 text-white hover:bg-slate-600"
                        >
                          <RefreshCw className="h-3 w-3 mr-2" />
                          Refresh
                        </Button>
                      </div>

                      {loreStories.length === 0 ? (
                        <div className="text-center py-12 text-white">
                          <BookOpen className="h-12 w-12 mx-auto mb-4 opacity-50" />
                          <p className="text-lg mb-2">No lore stories collected yet</p>
                          <p className="text-sm text-white">Use the tabs above to submit stories, discover lore, or record observations</p>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          {loreStories.map((story) => (
                            <Card key={story.story_id} className="bg-slate-700 border-slate-600 p-4">
                              <div className="flex items-start justify-between">
                                <div className="flex-1">
                                  <div className="flex items-center gap-2 mb-2">
                                    <h5 className="font-semibold text-white">{story.title}</h5>
                                    <Badge className={
                                      story.scenario_type === 'user_story' ? 'bg-blue-500' :
                                      story.scenario_type === 'ai_discovered' ? 'bg-purple-500' :
                                      'bg-green-500'
                                    }>
                                      {story.scenario_type === 'user_story' && 'User Story'}
                                      {story.scenario_type === 'ai_discovered' && 'AI Discovered'}
                                      {story.scenario_type === 'observation_based' && 'Observation'}
                                    </Badge>
                                    <Badge variant="outline" className={
                                      story.ai_status === 'completed' ? 'border-green-500 text-green-400' :
                                      story.ai_status === 'processing' ? 'border-yellow-500 text-yellow-400' :
                                      story.ai_status === 'failed' ? 'border-red-500 text-red-400' :
                                      'border-gray-500 text-white'
                                    }>
                                      {story.ai_status}
                                    </Badge>
                                  </div>

                                  {story.story_text && (
                                    <p className="text-sm text-white mb-2">{story.story_text.substring(0, 200)}{story.story_text.length > 200 ? '...' : ''}</p>
                                  )}

                                  {story.ai_status === 'completed' && story.ai_summary && (
                                    <div className="mt-3 p-3 bg-slate-800 rounded border border-slate-600">
                                      <p className="text-xs font-semibold text-orange-400 mb-1">AI Analysis:</p>
                                      <p className="text-sm text-white">{story.ai_summary}</p>
                                      <div className="grid grid-cols-3 gap-2 mt-2">
                                        {story.ai_recency_score !== null && (
                                          <div className="text-xs">
                                            <span className="text-white">Recency:</span>{' '}
                                            <span className="text-white font-semibold">{(story.ai_recency_score * 100).toFixed(0)}%</span>
                                          </div>
                                        )}
                                        {story.ai_spatial_relevance !== null && (
                                          <div className="text-xs">
                                            <span className="text-white">Spatial:</span>{' '}
                                            <span className="text-white font-semibold">{(story.ai_spatial_relevance * 100).toFixed(0)}%</span>
                                          </div>
                                        )}
                                        {story.ai_credibility_score !== null && (
                                          <div className="text-xs">
                                            <span className="text-white">Credibility:</span>{' '}
                                            <span className="text-white font-semibold">{(story.ai_credibility_score * 100).toFixed(0)}%</span>
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  )}

                                  {story.observation_sight && (
                                    <div className="mt-2 text-sm text-white">
                                      <span className="text-white">Observed:</span> {story.observation_sight}
                                    </div>
                                  )}
                                </div>
                              </div>
                            </Card>
                          ))}
                        </div>
                      )}
                    </div> */}
              </div>

              {/* Submit L Data Button */}
              <div className="p-4 border-t border-gray-200">
                <Button
                  className="bg-blue-600 hover:bg-blue-700 w-full"
                  onClick={handleSubmitLData}
                  disabled={isSubmittingL}
                >
                  {isSubmittingL ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    <>
                      <Database className="h-4 w-4 mr-2" />
                      Submit Data
                    </>
                  )}
                </Button>
                {lDataSaved && (
                  <p className="text-xs text-green-600 mt-2 text-center flex items-center justify-center gap-1">
                    <CheckCircle2 className="h-3 w-3" />
                    Data saved
                  </p>
                )}
              </div>
            </Card>

            {/* Card 3: V - Vulnerability */}
            <Card className="bg-white p-0 overflow-hidden flex flex-col" style={{maxHeight: '800px'}}>
              <div className="text-white text-center py-3" style={{backgroundColor: '#9c2fee'}}>
                <h3 className="font-semibold">V - Vulnerability</h3>
                <p className="text-xs mt-1">Exposure, fragility, and criticality of assets</p>
              </div>

              <div className="p-6 overflow-y-auto flex-1">
                {renderVFactorForm()}
              </div>

              {/* Submit V Data Button */}
              <div className="p-4 border-t border-gray-200">
                <Button
                  className="bg-blue-600 hover:bg-blue-700 w-full"
                  onClick={handleSubmitVData}
                  disabled={isSubmittingV}
                >
                  {isSubmittingV ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    <>
                      <Database className="h-4 w-4 mr-2" />
                      Submit Data
                    </>
                  )}
                </Button>
                {vDataSaved && (
                  <p className="text-xs text-green-600 mt-2 text-center flex items-center justify-center gap-1">
                    <CheckCircle2 className="h-3 w-3" />
                    Data saved
                  </p>
                )}
              </div>
            </Card>
          </div>
        </div>

        {/* Calculate Risk Button Section */}
        <div className="mt-2">
          <Button
            className="bg-blue-600 hover:bg-blue-700 mx-auto block"
            onClick={handleCalculateRisk}
            disabled={isCalculating}
          >
            {isCalculating ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                Calculating...
              </>
            ) : (
              'Calculate Risk'
            )}
          </Button>
        </div>

        {/* Version History Dialog */}
        <Dialog open={showVersionDialog} onOpenChange={setShowVersionDialog}>
          <DialogContent className="bg-slate-800 border-slate-700 text-white max-w-3xl max-h-[80vh] overflow-auto">
            <DialogHeader>
              <DialogTitle className="text-white flex items-center gap-2">
                <History className="h-5 w-5" />
                Version History: {versionItem?.name}
              </DialogTitle>
              <DialogDescription className="text-white">
                Track all versions and changes to this data source
              </DialogDescription>
            </DialogHeader>

            {versionItem && versionItem.versions && versionItem.versions.length > 0 ? (
              <div className="space-y-3 py-4">
                {[...versionItem.versions].reverse().map((version, index) => (
                  <div
                    key={version.version}
                    className={`bg-slate-700 rounded-lg p-4 border-l-4 ${
                      index === 0 ? 'border-green-500' : 'border-slate-600'
                    }`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Badge className={index === 0 ? 'bg-green-600' : 'bg-slate-600'}>
                          Version {version.version}
                        </Badge>
                        {index === 0 && (
                          <Badge className="bg-blue-600">Current</Badge>
                        )}
                      </div>
                      <span className="text-base text-white">
                        {new Date(version.timestamp).toLocaleString()}
                      </span>
                    </div>

                    <div className="space-y-2 text-base">
                      {version.fileName && (
                        <div className="flex items-center gap-2 text-white">
                          <FileText className="h-4 w-4" />
                          <span>{version.fileName}</span>
                          {version.fileSize && (
                            <span className="text-white">
                              ({(version.fileSize / 1024).toFixed(1)} KB)
                            </span>
                          )}
                        </div>
                      )}

                      <div className="flex items-center gap-2 text-white">
                        <Users className="h-4 w-4" />
                        <span>By: {version.uploadedBy || 'Current User'}</span>
                      </div>

                      {version.changes && (
                        <div className="flex items-start gap-2 text-white mt-2 pt-2 border-t border-slate-600">
                          <RefreshCw className="h-4 w-4 mt-0.5" />
                          <span className="flex-1">{version.changes}</span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-white py-8 text-center">No version history available</p>
            )}

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setShowVersionDialog(false)}
                className="bg-slate-700 text-white border-slate-600"
              >
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
