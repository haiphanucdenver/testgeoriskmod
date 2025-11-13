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
import { useState, useEffect } from "react";
import { historicalEventAPI, dataSourceAPI, loreAPI, getErrorMessage, checkAPIConnection } from "../services/api";
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

interface EventChange {
  timestamp: Date;
  action: 'created' | 'edited' | 'deleted';
  eventId: string;
  changes?: string;
  previousData?: Partial<HistoricalEvent>;
}

interface HistoricalEvent {
  id: string;
  eventType: string;
  date: string;
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
  const [isLoadingEvents, setIsLoadingEvents] = useState<boolean>(false);

  // Historical Events state
  const [historicalEvents, setHistoricalEvents] = useState<HistoricalEvent[]>([]);
  const [isEventDialogOpen, setIsEventDialogOpen] = useState(false);
  const [newEvent, setNewEvent] = useState<Partial<HistoricalEvent>>({
    eventType: '',
    date: '',
    location: '',
    description: '',
    source: '',
    credibility: 'newspaper',
    spatialAccuracy: 'approximate'
  });

  // Search and Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCredibility, setFilterCredibility] = useState<string>('all');
  const [filterEventType, setFilterEventType] = useState<string>('all');

  // Edit state
  const [editingEventId, setEditingEventId] = useState<string | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<Partial<HistoricalEvent>>({});

  // Sorting state
  const [sortField, setSortField] = useState<'date' | 'eventType' | 'credibility'>('date');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  // Bulk selection state
  const [selectedEventIds, setSelectedEventIds] = useState<Set<string>>(new Set());
  const [showStatistics, setShowStatistics] = useState(false);

  // Data versioning state
  const [showVersionDialog, setShowVersionDialog] = useState(false);
  const [versionItem, setVersionItem] = useState<DataItem | null>(null);
  const [eventChangeLog, setEventChangeLog] = useState<EventChange[]>([]);
  const [showChangeLog, setShowChangeLog] = useState(false);

  // Event type selection state
  const [selectedEventType, setSelectedEventType] = useState<string>('');
  const [dateObserved, setDateObserved] = useState<string>('');

  // Risk calculation results state
  const [riskResults, setRiskResults] = useState<any>(null);
  const [isCalculating, setIsCalculating] = useState(false);

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
    construction_quality: '', // 1-5 scale
    structure_type: '',
  });

  // AI-Driven Lore Collection state
  const [loreScenario, setLoreScenario] = useState<'story' | 'discover' | 'observation'>('story');
  const [loreStories, setLoreStories] = useState<any[]>([]);
  const [storyForm, setStoryForm] = useState({
    title: '',
    story_text: '',
    location_description: ''
  });
  const [discoverForm, setDiscoverForm] = useState({
    latitude: mapLocation.lat,
    longitude: mapLocation.lng,
    location_radius_m: 10000
  });
  const [observationForm, setObservationForm] = useState({
    title: '',
    latitude: mapLocation.lat,
    longitude: mapLocation.lng,
    observation_sight: '',
    observation_sound: ''
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
      id: 'historical-events',
      name: 'Historical Event Inventory',
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

    // For Local Lore, boost quality score if we have high-credibility historical events
    let qualityBoost = 0;
    if (factorType === 'L' && historicalEvents.length > 0) {
      const highCredibilityCount = historicalEvents.filter(
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

  // Handle adding historical event
  const handleAddHistoricalEvent = async () => {
    if (!newEvent.eventType || !newEvent.date || !newEvent.description) {
      toast.error('Please fill in all required fields');
      return;
    }

    try {
      // Call backend API to create event
      const response = await historicalEventAPI.create({
        location_id: 1, // Default location, update based on your needs
        eventType: newEvent.eventType || '',
        date: newEvent.date || '',
        location: newEvent.location || '',
        description: newEvent.description || '',
        source: newEvent.source || '',
        credibility: newEvent.credibility as any || 'newspaper',
        spatialAccuracy: newEvent.spatialAccuracy as any || 'approximate',
      });

      const now = new Date();
      const event: HistoricalEvent = {
        id: response.id.toString(),
        eventType: newEvent.eventType || '',
        date: newEvent.date || '',
        location: newEvent.location || '',
        description: newEvent.description || '',
        source: newEvent.source || '',
        credibility: newEvent.credibility || 'newspaper',
        spatialAccuracy: newEvent.spatialAccuracy || 'approximate',
        createdAt: now,
        lastModified: now
      };

      setHistoricalEvents(prev => [...prev, event]);

      // Add to change log
      setEventChangeLog(prev => [...prev, {
        timestamp: now,
        action: 'created',
        eventId: event.id,
        changes: `Created new ${event.eventType} event: ${event.date}`
      }]);

      setIsEventDialogOpen(false);
      setNewEvent({
        eventType: '',
        date: '',
        location: '',
        description: '',
        source: '',
        credibility: 'newspaper',
        spatialAccuracy: 'approximate'
      });

      // Update Local Lore status to uploaded if first event
      if (historicalEvents.length === 0) {
        setLocalLoreData(prev => prev.map(item =>
          item.id === 'historical-events' ? { ...item, status: 'uploaded' as const } : item
        ));
      }

      toast.success('Historical event saved successfully!');
    } catch (error) {
      console.error('Failed to save historical event:', error);
      toast.error(`Failed to save event: ${getErrorMessage(error)}`);
    }
  };

  // Handle deleting historical event
  const handleDeleteEvent = async (eventId: string) => {
    try {
      const deletedEvent = historicalEvents.find(e => e.id === eventId);
      
      // Call backend API to delete event
      await historicalEventAPI.delete(eventId);
      
      setHistoricalEvents(prev => prev.filter(e => e.id !== eventId));

      // Add to change log
      if (deletedEvent) {
        setEventChangeLog(prev => [...prev, {
          timestamp: new Date(),
          action: 'deleted',
          eventId: eventId,
          changes: `Deleted ${deletedEvent.eventType} event: ${deletedEvent.date}`,
          previousData: deletedEvent
        }]);
      }

      // Update Local Lore status back to missing if no events left
      if (historicalEvents.length === 1) {
        setLocalLoreData(prev => prev.map(item =>
          item.id === 'historical-events' ? { ...item, status: 'missing' as const } : item
        ));
      }

      toast.success('Historical event deleted successfully');
    } catch (error) {
      console.error('Failed to delete historical event:', error);
      toast.error(`Failed to delete event: ${getErrorMessage(error)}`);
    }
  };

  // Handle opening edit dialog
  const handleOpenEditDialog = (event: HistoricalEvent) => {
    setEditingEventId(event.id);
    setEditingEvent({
      eventType: event.eventType,
      date: event.date,
      location: event.location,
      description: event.description,
      source: event.source,
      credibility: event.credibility,
      spatialAccuracy: event.spatialAccuracy
    });
    setIsEditDialogOpen(true);
  };

  // Handle saving edited event
  const handleSaveEditedEvent = async () => {
    if (!editingEventId || !editingEvent.eventType || !editingEvent.date || !editingEvent.description) {
      toast.error('Please fill in all required fields');
      return;
    }

    try {
      const now = new Date();
      const originalEvent = historicalEvents.find(e => e.id === editingEventId);

      // Build changes description
      const changes = [];
      if (originalEvent) {
        if (editingEvent.eventType && editingEvent.eventType !== originalEvent.eventType) {
          changes.push(`type: ${originalEvent.eventType} → ${editingEvent.eventType}`);
        }
        if (editingEvent.date && editingEvent.date !== originalEvent.date) {
          changes.push(`date: ${originalEvent.date} → ${editingEvent.date}`);
        }
        if (editingEvent.credibility && editingEvent.credibility !== originalEvent.credibility) {
          changes.push(`credibility: ${originalEvent.credibility} → ${editingEvent.credibility}`);
        }
      }

      // Call backend API to update event
      await historicalEventAPI.update(editingEventId, {
        location_id: 1,
        eventType: editingEvent.eventType || '',
        date: editingEvent.date || '',
        location: editingEvent.location || '',
        description: editingEvent.description || '',
        source: editingEvent.source || '',
        credibility: editingEvent.credibility as any || 'newspaper',
        spatialAccuracy: editingEvent.spatialAccuracy as any || 'approximate',
      });

      setHistoricalEvents(prev => prev.map(event =>
        event.id === editingEventId
          ? {
              ...event,
              eventType: editingEvent.eventType || event.eventType,
              date: editingEvent.date || event.date,
              location: editingEvent.location || event.location,
              description: editingEvent.description || event.description,
              source: editingEvent.source || event.source,
              credibility: editingEvent.credibility || event.credibility,
              spatialAccuracy: editingEvent.spatialAccuracy || event.spatialAccuracy,
              lastModified: now
            }
          : event
      ));

      // Add to change log
      if (originalEvent && changes.length > 0) {
        setEventChangeLog(prev => [...prev, {
          timestamp: now,
          action: 'edited',
          eventId: editingEventId,
          changes: `Edited event: ${changes.join(', ')}`,
          previousData: originalEvent
        }]);
      }

      setIsEditDialogOpen(false);
      setEditingEventId(null);
      setEditingEvent({});

      toast.success('Historical event updated successfully!');
    } catch (error) {
      console.error('Failed to update historical event:', error);
      toast.error(`Failed to update event: ${getErrorMessage(error)}`);
    }
  };

  // Handle canceling edit
  const handleCancelEdit = () => {
    setIsEditDialogOpen(false);
    setEditingEventId(null);
    setEditingEvent({});
  };

  // Handle bulk selection
  const handleToggleSelectEvent = (eventId: string) => {
    setSelectedEventIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(eventId)) {
        newSet.delete(eventId);
      } else {
        newSet.add(eventId);
      }
      return newSet;
    });
  };

  // Handle select all visible events
  const handleSelectAllVisible = () => {
    if (selectedEventIds.size === filteredAndSortedEvents.length) {
      // If all visible are selected, deselect all
      setSelectedEventIds(new Set());
    } else {
      // Select all visible events
      setSelectedEventIds(new Set(filteredAndSortedEvents.map(e => e.id)));
    }
  };

  // Handle bulk delete
  const handleBulkDelete = () => {
    if (selectedEventIds.size === 0) return;

    setHistoricalEvents(prev => prev.filter(e => !selectedEventIds.has(e.id)));
    setSelectedEventIds(new Set());

    // Update Local Lore status back to missing if no events left
    if (historicalEvents.length === selectedEventIds.size) {
      setLocalLoreData(prev => prev.map(item =>
        item.id === 'historical-events' ? { ...item, status: 'missing' as const } : item
      ));
    }
  };

  // Handle bulk export
  const handleBulkExportCSV = () => {
    if (selectedEventIds.size === 0) return;

    const selectedEvents = historicalEvents.filter(e => selectedEventIds.has(e.id));
    const headers = ['Event Type', 'Date', 'Location', 'Description', 'Source', 'Credibility', 'Spatial Accuracy'];
    const csvContent = [
      headers.join(','),
      ...selectedEvents.map(event => [
        `"${event.eventType}"`,
        `"${event.date}"`,
        `"${event.location}"`,
        `"${event.description.replace(/"/g, '""')}"`,
        `"${event.source}"`,
        `"${event.credibility}"`,
        `"${event.spatialAccuracy}"`
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
    if (selectedEventIds.size === 0) return;

    const selectedEvents = historicalEvents.filter(e => selectedEventIds.has(e.id));
    const jsonContent = JSON.stringify(selectedEvents, null, 2);
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
  const handleExportCSV = () => {
    if (historicalEvents.length === 0) return;

    const headers = ['Event Type', 'Date', 'Location', 'Description', 'Source', 'Credibility', 'Spatial Accuracy'];
    const csvContent = [
      headers.join(','),
      ...historicalEvents.map(event => [
        `"${event.eventType}"`,
        `"${event.date}"`,
        `"${event.location}"`,
        `"${event.description.replace(/"/g, '""')}"`,
        `"${event.source}"`,
        `"${event.credibility}"`,
        `"${event.spatialAccuracy}"`
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
    if (historicalEvents.length === 0) return;

    const jsonContent = JSON.stringify(historicalEvents, null, 2);
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

  // Filter and sort historical events
  const filteredAndSortedEvents = historicalEvents
    .filter(event => {
      // Search filter (searches across multiple fields)
      const searchLower = searchQuery.toLowerCase();
      const matchesSearch = searchQuery === '' ||
        event.eventType.toLowerCase().includes(searchLower) ||
        event.date.toLowerCase().includes(searchLower) ||
        event.location.toLowerCase().includes(searchLower) ||
        event.description.toLowerCase().includes(searchLower) ||
        event.source.toLowerCase().includes(searchLower);

      // Credibility filter
      const matchesCredibility = filterCredibility === 'all' || event.credibility === filterCredibility;

      // Event type filter
      const matchesEventType = filterEventType === 'all' || event.eventType.toLowerCase().includes(filterEventType.toLowerCase());

      return matchesSearch && matchesCredibility && matchesEventType;
    })
    .sort((a, b) => {
      let comparison = 0;

      if (sortField === 'date') {
        // Simple string comparison for dates (works for many formats like "1996", "March 2020", "2020-03-15")
        comparison = a.date.localeCompare(b.date);
      } else if (sortField === 'eventType') {
        comparison = a.eventType.localeCompare(b.eventType);
      } else if (sortField === 'credibility') {
        const credibilityOrder = { 'instrumented': 1, 'eyewitness': 2, 'expert': 3, 'newspaper': 4, 'oral-tradition': 5 };
        comparison = (credibilityOrder[a.credibility] || 99) - (credibilityOrder[b.credibility] || 99);
      }

      return sortDirection === 'asc' ? comparison : -comparison;
    });

  // Get unique event types for filter dropdown
  const uniqueEventTypes = Array.from(new Set(historicalEvents.map(e => e.eventType).filter(t => t)));

  // Calculate statistics
  const statistics = {
    total: historicalEvents.length,
    byType: historicalEvents.reduce((acc, event) => {
      acc[event.eventType] = (acc[event.eventType] || 0) + 1;
      return acc;
    }, {} as Record<string, number>),
    byCredibility: historicalEvents.reduce((acc, event) => {
      acc[event.credibility] = (acc[event.credibility] || 0) + 1;
      return acc;
    }, {} as Record<string, number>),
    dateRange: historicalEvents.length > 0 ? {
      earliest: historicalEvents.map(e => e.date).sort()[0],
      latest: historicalEvents.map(e => e.date).sort()[historicalEvents.length - 1]
    } : null
  };

  // Clear all filters
  const clearFilters = () => {
    setSearchQuery('');
    setFilterCredibility('all');
    setFilterEventType('all');
  };

  const hasActiveFilters = searchQuery !== '' || filterCredibility !== 'all' || filterEventType !== 'all';

  // ========== AI-DRIVEN LORE COLLECTION HANDLERS ==========

  // Load lore stories from database
  const loadLoreStories = async () => {
    try {
      const response = await loreAPI.getStories();
      setLoreStories(response.stories);
      console.log(`Loaded ${response.count} lore stories`);
    } catch (error) {
      console.error('Failed to load lore stories:', error);
      toast.error('Failed to load lore stories');
    }
  };

  // Scenario 1: Submit story/lore for AI analysis
  const handleSubmitStory = async () => {
    if (!storyForm.title || !storyForm.story_text) {
      toast.error('Please provide both title and story text');
      return;
    }

    const loadingToast = toast.loading('Submitting story to AI for analysis...');

    try {
      const response = await loreAPI.submitStory({
        title: storyForm.title,
        story_text: storyForm.story_text,
        location_description: storyForm.location_description,
        created_by: 'Current User'
      });

      toast.dismiss(loadingToast);

      if (response.ai_status === 'completed') {
        toast.success(`Story analyzed successfully! AI extracted: ${response.ai_results?.ai_event_type || 'information'}`);
      } else {
        toast.error(`Story submitted but AI analysis failed: ${response.error}`);
      }

      // Clear form and reload stories
      setStoryForm({ title: '', story_text: '', location_description: '' });
      await loadLoreStories();
    } catch (error) {
      toast.dismiss(loadingToast);
      console.error('Failed to submit story:', error);
      toast.error(getErrorMessage(error));
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

      if (response.story_ids.length > 0) {
        toast.success(`AI discovered ${response.story_ids.length} lore stories at this location!`);
      } else {
        toast.info('No lore found at this location. Try expanding the search radius.');
      }

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

      if (response.ai_status === 'completed') {
        const urgency = response.ai_results?.urgency_level;
        if (urgency === 'high') {
          toast.error(`URGENT: ${response.ai_results?.interpretation}`, { duration: 10000 });
        } else {
          toast.success(`Observation analyzed: ${response.ai_results?.interpretation}`);
        }
      } else {
        toast.error(`Observation submitted but AI analysis failed: ${response.error}`);
      }

      // Clear form and reload stories
      setObservationForm({
        title: '',
        latitude: mapLocation.lat,
        longitude: mapLocation.lng,
        observation_sight: '',
        observation_sound: ''
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
    const MAPBOX_API_KEY = import.meta.env.VITE_MAPBOX_API_KEY;
    if (!MAPBOX_API_KEY || MAPBOX_API_KEY === 'YOUR_MAPBOX_API_KEY_HERE') {
      setLocationName("Mount Hood Area, Oregon, USA");
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

  // Load historical events from backend on mount
  useEffect(() => {
    if (!isAPIConnected) return;

    const loadHistoricalEvents = async () => {
      setIsLoadingEvents(true);
      try {
        const response = await historicalEventAPI.getAll();
        const events: HistoricalEvent[] = response.events.map((e: any) => ({
          id: e.id,
          eventType: e.eventType,
          date: e.date,
          location: e.location,
          description: e.description,
          source: e.source,
          credibility: e.credibility,
          spatialAccuracy: e.spatialAccuracy,
          createdAt: e.created_at ? new Date(e.created_at) : undefined,
          lastModified: e.created_at ? new Date(e.created_at) : undefined
        }));
        
        setHistoricalEvents(events);
        
        // Update Local Lore status if we have events
        if (events.length > 0) {
          setLocalLoreData(prev => prev.map(item =>
            item.id === 'historical-events' ? { ...item, status: 'uploaded' as const } : item
          ));
        }
        
        console.log(`Loaded ${events.length} historical events from database`);
      } catch (error) {
        console.error('Failed to load historical events:', error);
        toast.error('Failed to load historical events from database');
      } finally {
        setIsLoadingEvents(false);
      }
    };

    loadHistoricalEvents();
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

      // Call API endpoint
      const response = await fetch('http://localhost:8001/api/calculate-risk', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestData),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Risk calculation failed');
      }

      const result = await response.json();
      setRiskResults(result.data);

      // Notify parent component of risk calculation
      if (onRiskCalculated) {
        onRiskCalculated(result.data);
      }

      toast.success(`Risk calculated successfully! Risk Level: ${result.data.risk_level}`);
    } catch (error: any) {
      console.error('Risk calculation error:', error);
      toast.error(error.message || 'Failed to calculate risk. Make sure the backend server is running.');
    } finally {
      setIsCalculating(false);
    }
  };

  // Render completeness indicator
  const renderCompleteness = (completed: number, total: number) => {
    const circles = [];
    for (let i = 0; i < total; i++) {
      circles.push(
        <div
          key={i}
          className={`w-4 h-4 rounded-full ${i < completed ? 'bg-green-500' : 'bg-gray-600'}`}
        />
      );
    }
    return <div className="flex gap-1">{circles}</div>;
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
        {/* File Upload */}
        <div className="mb-4">
          <Label className="text-gray-900 mb-2 block">Upload DEM File (GeoTIFF)</Label>
          <div className="relative">
            <input
              type="file"
              accept=".tif,.tiff"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) {
                  setHData({...hData, dem_file: file});
                  toast.success(`DEM file "${file.name}" selected`);
                }
              }}
              className="hidden"
              id="dem-file-input"
            />
            <label
              htmlFor="dem-file-input"
              className="inline-flex items-center justify-center gap-2 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-md cursor-pointer transition-colors border border-blue-500"
            >
              <Upload className="h-4 w-4" />
              <span>Choose File</span>
            </label>
            {hData.dem_file && (
              <p className="text-sm text-gray-900 mt-2">Selected: {hData.dem_file.name}</p>
            )}
          </div>
          <p className="text-xs text-gray-700 mt-1">Or enter terrain values manually below</p>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-6">
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
            <p className="text-xs text-gray-700 mt-1">Average slope angle. Steeper slopes increase landslide susceptibility.</p>
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
            <p className="text-xs text-gray-700 mt-1">Terrain curvature. Negative (concave) areas accumulate water and increase risk.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 mb-6">
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
        </div>

        <div className="grid grid-cols-2 gap-4">
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
            <p className="text-xs text-gray-700 mt-1">Hourly rainfall rate that triggered or may trigger the event.</p>
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
          <div>
            <Label className="text-gray-900 mb-2 block">Return Period (years)</Label>
            <Input
              type="number"
              step="1"
              value={hData.return_period}
              onChange={(e) => setHData({...hData, return_period: e.target.value})}
              placeholder="e.g., 100"
              className="bg-gray-100 border-gray-300 text-gray-900"
            />
            <p className="text-xs text-gray-700 mt-1">Statistical recurrence interval for rainfall events of this magnitude.</p>
          </div>
        </div>
      </Card>
    );
  };

  // Render detailed V Factor data entry forms - focused on risk calculation needs
  const renderVFactorForm = () => {
    return (
      <Card className="p-6">
        <div className="grid grid-cols-2 gap-4 mb-6">
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
          <div className="col-span-2">
            <Label className="text-gray-900 mb-2 block">Criticality Weight (optional)</Label>
            <Input
              type="number"
              step="0.01"
              min="0"
              max="1"
              value={vData.criticality_weight}
              onChange={(e) => setVData({...vData, criticality_weight: e.target.value})}
              placeholder="e.g., 0.3 (default)"
              className="bg-gray-100 border-gray-300 text-gray-900"
            />
            <p className="text-xs text-gray-700 mt-1">Optional weight factor for areas with critical facilities (hospitals, schools, emergency services).</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-6">
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
            <p className="text-xs text-gray-700 mt-1">Number of people per square kilometer in the affected area.</p>
          </div>
          <div>
            <Label className="text-gray-900 mb-2 block">Building Count</Label>
            <Input
              type="number"
              step="1"
              value={vData.building_count}
              onChange={(e) => setVData({...vData, building_count: e.target.value})}
              placeholder="e.g., 350"
              className="bg-gray-100 border-gray-300 text-gray-900"
            />
            <p className="text-xs text-gray-700 mt-1">Total number of structures in the area that could be affected.</p>
          </div>
          <div>
            <Label className="text-gray-900 mb-2 block">Road Length (m)</Label>
            <Input
              type="number"
              step="1"
              value={vData.road_length}
              onChange={(e) => setVData({...vData, road_length: e.target.value})}
              placeholder="e.g., 15000"
              className="bg-gray-100 border-gray-300 text-gray-900"
            />
            <p className="text-xs text-gray-700 mt-1">Total length of roadways in meters that could be impacted.</p>
          </div>
          <div>
            <Label className="text-gray-900 mb-2 block">Critical Facilities Count</Label>
            <Input
              type="number"
              step="1"
              value={vData.critical_facilities_count}
              onChange={(e) => setVData({...vData, critical_facilities_count: e.target.value})}
              placeholder="e.g., 5"
              className="bg-gray-100 border-gray-300 text-gray-900"
            />
            <p className="text-xs text-gray-700 mt-1">Number of essential facilities (hospitals, schools, emergency services) in the area.</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label className="text-gray-900 mb-2 block">Average Building Age (years)</Label>
            <Input
              type="number"
              step="1"
              value={vData.avg_building_age}
              onChange={(e) => setVData({...vData, avg_building_age: e.target.value})}
              placeholder="e.g., 35"
              className="bg-gray-100 border-gray-300 text-gray-900"
            />
            <p className="text-xs text-gray-700 mt-1">Mean age of buildings in the area. Older structures tend to have higher fragility.</p>
          </div>
          <div>
            <Label className="text-gray-900 mb-2 block">Construction Quality (1-5)</Label>
            <Select
              value={vData.construction_quality}
              onValueChange={(val) => setVData({...vData, construction_quality: val})}
            >
              <SelectTrigger className="bg-gray-100 border-gray-300 text-gray-900">
                <SelectValue placeholder="Select quality" />
              </SelectTrigger>
              <SelectContent className="bg-white border-gray-300 text-gray-900">
                <SelectItem value="1">1 - Poor (high fragility)</SelectItem>
                <SelectItem value="2">2 - Below Average</SelectItem>
                <SelectItem value="3">3 - Average</SelectItem>
                <SelectItem value="4">4 - Good</SelectItem>
                <SelectItem value="5">5 - Excellent (low fragility)</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-gray-700 mt-1">Building construction quality rating. Lower quality indicates higher fragility.</p>
          </div>
          <div className="col-span-2">
            <Label className="text-gray-900 mb-2 block">Primary Structure Type</Label>
            <Select
              value={vData.structure_type}
              onValueChange={(val) => setVData({...vData, structure_type: val})}
            >
              <SelectTrigger className="bg-gray-100 border-gray-300 text-gray-900">
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent className="bg-white border-gray-300 text-gray-900">
                <SelectItem value="wood_frame">Wood Frame (moderate fragility)</SelectItem>
                <SelectItem value="unreinforced_masonry">Unreinforced Masonry (high fragility)</SelectItem>
                <SelectItem value="steel_frame">Steel Frame (low fragility)</SelectItem>
                <SelectItem value="concrete_frame">Reinforced Concrete (low fragility)</SelectItem>
                <SelectItem value="mixed">Mixed Construction</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-gray-700 mt-1">Dominant building construction type. Different materials have varying resistance to hazards.</p>
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

          <Button
            className="bg-blue-600 hover:bg-blue-700 mt-6"
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

        {/* Risk Calculation Results */}
        {riskResults && (
          <Card className="bg-slate-800 border-slate-700 p-6 mt-6">
            <div className="flex items-center gap-3 mb-6">
              <BarChart3 className="h-6 w-6 text-blue-400" />
              <h3 className="text-xl font-semibold text-white">Risk Calculation Results</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Overall Risk Score */}
              <div className="mb-6">
                <h4 className="text-white font-semibold mb-2 flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-blue-400" />
                  Overall Risk Score
                </h4>
                <div className="text-4xl font-bold text-white mb-2">
                  {(riskResults.R_score * 100).toFixed(1)}%
                </div>
                <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium ${
                  riskResults.risk_level === 'very-high' ? 'bg-red-900 text-red-200 border border-red-600' :
                  riskResults.risk_level === 'high' ? 'bg-orange-900 text-orange-200 border border-orange-600' :
                  riskResults.risk_level === 'medium' ? 'bg-yellow-900 text-yellow-200 border border-yellow-600' :
                  riskResults.risk_level === 'low' ? 'bg-blue-900 text-blue-200 border border-blue-600' :
                  'bg-green-900 text-green-200 border border-green-600'
                }`}>
                  {riskResults.risk_level === 'very-high' ? <ShieldX className="h-4 w-4" /> :
                   riskResults.risk_level === 'high' ? <ShieldAlert className="h-4 w-4" /> :
                   <ShieldCheck className="h-4 w-4" />}
                  <span className="capitalize">{riskResults.risk_level.replaceAll('-', ' ')}</span>
                </div>
                <p className="text-sm text-white mt-3">
                  Uncertainty: ±{(riskResults.R_std * 100).toFixed(1)}%
                </p>
                <p className="text-sm text-white mt-1">
                  Gate Status: {riskResults.gate_passed ?
                    <span className="text-green-400">✓ Passed</span> :
                    <span className="text-red-400">✗ Failed</span>
                  }
                </p>
              </div>

              {/* Factor Scores */}
              <div className="mb-6">
                <h4 className="text-white font-semibold mb-4">Borromean Factor Scores</h4>

                <div className="space-y-3">
                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-white text-sm">H - Event Drivers</span>
                      <span className="text-white font-semibold">{(riskResults.H_score * 100).toFixed(1)}%</span>
                    </div>
                    <div className="w-full bg-slate-600 rounded-full h-2">
                      <div
                        className="bg-blue-500 h-2 rounded-full transition-all duration-500"
                        style={{width: `${riskResults.H_score * 100}%`}}
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-white text-sm">L - Local Lore</span>
                      <span className="text-white font-semibold">{(riskResults.L_score * 100).toFixed(1)}%</span>
                    </div>
                    <div className="w-full bg-slate-600 rounded-full h-2">
                      <div
                        className="h-2 rounded-full transition-all duration-500"
                        style={{width: `${riskResults.L_score * 100}%`, backgroundColor: '#8B4513'}}
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-white text-sm">V - Vulnerability</span>
                      <span className="text-white font-semibold">{(riskResults.V_score * 100).toFixed(1)}%</span>
                    </div>
                    <div className="w-full bg-slate-600 rounded-full h-2">
                      <div
                        className="bg-purple-500 h-2 rounded-full transition-all duration-500"
                        style={{width: `${riskResults.V_score * 100}%`}}
                      />
                    </div>
                  </div>
                </div>

                <div className="mt-4 p-3 bg-slate-600 rounded">
                  <p className="text-xs text-white">
                    <Info className="h-3 w-3 inline mr-1" />
                    Borromean model requires all three factors (H, L, V) above their thresholds
                  </p>
                </div>
              </div>
            </div>

            {/* Configuration Details */}
            <Card className="bg-slate-700 border-slate-600 p-4 mt-4">
              <h4 className="text-white font-semibold mb-3">Calculation Configuration</h4>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3 text-sm">
                <div>
                  <span className="text-gray-400">Event Type:</span>
                  <p className="text-white font-medium capitalize">{riskResults.config.hazard_type}</p>
                </div>
                <div>
                  <span className="text-gray-400">H Threshold:</span>
                  <p className="text-white font-medium">{riskResults.config.tau_H}</p>
                </div>
                <div>
                  <span className="text-gray-400">L Threshold:</span>
                  <p className="text-white font-medium">{riskResults.config.tau_L}</p>
                </div>
                <div>
                  <span className="text-gray-400">V Threshold:</span>
                  <p className="text-white font-medium">{riskResults.config.tau_V}</p>
                </div>
                <div>
                  <span className="text-gray-400">Synergy:</span>
                  <p className="text-white font-medium">{riskResults.config.kappa_synergy}</p>
                </div>
              </div>
            </Card>
          </Card>
        )}

        {/* Three-Card Data Entry */}
        <div className="bg-slate-800 rounded-lg p-6">
          <h2 className="text-xl font-semibold text-white mb-6 text-center">
            Borromean Risk Model - Data Entry
          </h2>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Card 1: H - Event Drivers */}
            <Card className="bg-white p-0 overflow-hidden flex flex-col" style={{maxHeight: '800px'}}>
              <div className="text-white text-center py-3" style={{backgroundColor: '#263ef7'}}>
                <h3 className="font-semibold">H - Event Drivers</h3>
                <p className="text-xs mt-1">Physical factors that trigger mass movements</p>
              </div>

              <div className="p-6 overflow-y-auto flex-1">
                {renderHFactorForm()}
              </div>
            </Card>

            {/* Card 2: L - Local Lore & History */}
            <Card className="bg-white p-0 overflow-hidden flex flex-col" style={{maxHeight: '800px'}}>
              <div className="text-white text-center py-3" style={{backgroundColor: '#30a6ec'}}>
                <h3 className="font-semibold">L - Local Lore & History</h3>
                <p className="text-xs mt-1">Place-based evidence and historical events</p>
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

                    {/* Scenario 1: Submit Story */}
                    {loreScenario === 'story' && (
                      <Card className="bg-white border-gray-200 p-6">
                        <div className="mb-4">
                          <h4 className="text-md font-semibold text-gray-900 mb-2">Submit Story/Lore</h4>
                          <p className="text-sm text-gray-700">
                            Provide a story or lore (text or file). Our AI agent will analyze it to extract recency, spatial information, and credibility.
                          </p>
                        </div>

                        <div className="space-y-4">
                          <div>
                            <Label htmlFor="story-title" className="text-gray-900">Title *</Label>
                            <Input
                              id="story-title"
                              placeholder="e.g., Old logging road landslide"
                              value={storyForm.title}
                              onChange={(e) => setStoryForm({...storyForm, title: e.target.value})}
                              className="bg-gray-100 border-gray-300 text-gray-900 mt-2"
                            />
                          </div>

                          <div>
                            <Label htmlFor="story-text" className="text-gray-900">Story/Lore *</Label>
                            <Textarea
                              id="story-text"
                              placeholder="Tell the story... e.g., My grandfather told me about a massive landslide in 1952..."
                              value={storyForm.story_text}
                              onChange={(e) => setStoryForm({...storyForm, story_text: e.target.value})}
                              className="bg-gray-100 border-gray-300 text-gray-900 mt-2 min-h-[300px]"
                            />
                          </div>

                          <div>
                            <Label htmlFor="story-location" className="text-gray-900">Location (Optional)</Label>
                            <Input
                              id="story-location"
                              placeholder="e.g., Near Eagle Creek, Mt. Hood area"
                              value={storyForm.location_description}
                              onChange={(e) => setStoryForm({...storyForm, location_description: e.target.value})}
                              className="bg-gray-100 border-gray-300 text-gray-900 mt-2"
                            />
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

                        <div className="space-y-4">
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <Label htmlFor="discover-lat" className="text-gray-900">Latitude *</Label>
                              <Input
                                id="discover-lat"
                                type="number"
                                step="0.0001"
                                placeholder={mapLocation.lat.toFixed(4)}
                                value={discoverForm.latitude || ''}
                                onChange={(e) => setDiscoverForm({...discoverForm, latitude: parseFloat(e.target.value)})}
                                className="bg-gray-100 border-gray-300 text-gray-900 mt-2"
                              />
                            </div>
                            <div>
                              <Label htmlFor="discover-lon" className="text-gray-900">Longitude *</Label>
                              <Input
                                id="discover-lon"
                                type="number"
                                step="0.0001"
                                placeholder={mapLocation.lng.toFixed(4)}
                                value={discoverForm.longitude || ''}
                                onChange={(e) => setDiscoverForm({...discoverForm, longitude: parseFloat(e.target.value)})}
                                className="bg-gray-100 border-gray-300 text-gray-900 mt-2"
                              />
                            </div>
                          </div>

                          <div>
                            <Label htmlFor="discover-radius" className="text-gray-900">Search Radius (meters)</Label>
                            <Input
                              id="discover-radius"
                              type="number"
                              placeholder="10000"
                              value={discoverForm.location_radius_m || ''}
                              onChange={(e) => setDiscoverForm({...discoverForm, location_radius_m: parseInt(e.target.value)})}
                              className="bg-gray-100 border-gray-300 text-gray-900 mt-2"
                            />
                            <p className="text-xs text-gray-700 mt-1">Default: 10,000 meters (10 km)</p>
                          </div>

                          <div className="flex flex-col gap-4">
                            <Button
                              variant="outline"
                              onClick={() => setDiscoverForm({
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

                        <div className="space-y-4">
                          <div>
                            <Label htmlFor="obs-title" className="text-gray-900">Observation Title *</Label>
                            <Input
                              id="obs-title"
                              placeholder="e.g., Fresh scarp on hillside"
                              value={observationForm.title}
                              onChange={(e) => setObservationForm({...observationForm, title: e.target.value})}
                              className="bg-gray-100 border-gray-300 text-gray-900 mt-2"
                            />
                          </div>

                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <Label htmlFor="obs-lat" className="text-gray-900">Latitude *</Label>
                              <Input
                                id="obs-lat"
                                type="number"
                                step="0.0001"
                                placeholder={mapLocation.lat.toFixed(4)}
                                value={observationForm.latitude || ''}
                                onChange={(e) => setObservationForm({...observationForm, latitude: parseFloat(e.target.value)})}
                                className="bg-gray-100 border-gray-300 text-gray-900 mt-2"
                              />
                            </div>
                            <div>
                              <Label htmlFor="obs-lon" className="text-gray-900">Longitude *</Label>
                              <Input
                                id="obs-lon"
                                type="number"
                                step="0.0001"
                                placeholder={mapLocation.lng.toFixed(4)}
                                value={observationForm.longitude || ''}
                                onChange={(e) => setObservationForm({...observationForm, longitude: parseFloat(e.target.value)})}
                                className="bg-gray-100 border-gray-300 text-gray-900 mt-2"
                              />
                            </div>
                          </div>

                          <div>
                            <Label htmlFor="obs-sight" className="text-gray-900">What did you see?</Label>
                            <Textarea
                              id="obs-sight"
                              placeholder="Describe visual observations... e.g., A fresh scarp about 2 meters high with exposed soil and tilted trees"
                              value={observationForm.observation_sight}
                              onChange={(e) => setObservationForm({...observationForm, observation_sight: e.target.value})}
                              className="bg-gray-100 border-gray-300 text-gray-900 mt-2 min-h-[80px]"
                            />
                          </div>

                          <div>
                            <Label htmlFor="obs-sound" className="text-gray-900">What did you hear?</Label>
                            <Textarea
                              id="obs-sound"
                              placeholder="Describe auditory observations... e.g., Cracking sounds coming from the hillside"
                              value={observationForm.observation_sound}
                              onChange={(e) => setObservationForm({...observationForm, observation_sound: e.target.value})}
                              className="bg-gray-100 border-gray-300 text-gray-900 mt-2 min-h-[80px]"
                            />
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
            </Card>
          </div>
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
                        <span>By: {version.uploadedBy || 'Unknown'}</span>
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
