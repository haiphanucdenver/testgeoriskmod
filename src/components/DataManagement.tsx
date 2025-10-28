import { Button } from "./ui/button";
import { Card } from "./ui/card";
import { Input } from "./ui/input";
import { Badge } from "./ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "./ui/table";
import {
  Upload,
  Download,
  Database,
  FileX,
  CheckCircle,
  AlertTriangle,
  Calendar,
} from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { toast } from "sonner@2.0.3";

export function DataManagement() {
  const handleSubmitData = () => {
    toast.success("AI Processing...", {
      description: "Your data is being processed by AI",
      duration: 3000,
    });
  };

  const datasets = [
    {
      id: 1,
      name: "Topographical Survey 2024",
      type: "Elevation Data",
      size: "2.4 GB",
      lastUpdated: "2024-03-15",
      status: "Active",
      quality: "High",
    },
    {
      id: 2,
      name: "Historical Flood Records",
      type: "Event History",
      size: "156 MB",
      lastUpdated: "2024-03-10",
      status: "Active",
      quality: "Medium",
    },
    {
      id: 3,
      name: "Population Density Grid",
      type: "Demographics",
      size: "89 MB",
      lastUpdated: "2024-02-28",
      status: "Inactive",
      quality: "High",
    },
    {
      id: 4,
      name: "Infrastructure Assets",
      type: "Infrastructure",
      size: "324 MB",
      lastUpdated: "2024-03-12",
      status: "Active",
      quality: "Low",
    },
  ];

  const dataSources = [
    {
      name: "USGS Elevation Service",
      status: "Connected",
      lastUpload: "2024-03-15 14:30",
    },
    {
      name: "NOAA Weather Data",
      status: "Connected",
      lastUpload: "2024-03-15 12:00",
    },
    {
      name: "Local Government GIS",
      status: "Disconnected",
      lastUpload: "2024-03-10 09:15",
    },
    {
      name: "Emergency Services API",
      status: "Connected",
      lastUpload: "2024-03-15 13:45",
    },
  ];

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "Active":
        return (
          <Badge className="bg-green-600 hover:bg-green-700">
            Active
          </Badge>
        );
      case "Inactive":
        return <Badge variant="secondary">Inactive</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getQualityBadge = (quality: string) => {
    switch (quality) {
      case "High":
        return (
          <Badge className="bg-blue-600 hover:bg-blue-700">
            High
          </Badge>
        );
      case "Medium":
        return (
          <Badge className="bg-yellow-600 hover:bg-yellow-700">
            Medium
          </Badge>
        );
      case "Low":
        return (
          <Badge className="bg-red-600 hover:bg-red-700">
            Low
          </Badge>
        );
      default:
        return <Badge variant="outline">{quality}</Badge>;
    }
  };

  const getConnectionIcon = (status: string) => {
    return status === "Connected" ? (
      <CheckCircle className="h-4 w-4 text-green-500" />
    ) : (
      <AlertTriangle className="h-4 w-4 text-red-500" />
    );
  };

  return (
    <div className="flex-1 bg-gray-900 text-white p-6 overflow-auto">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-white">
              Data Management
            </h1>
            <p className="text-gray-400 mt-1">
              Location: Mountain Ridge, British Columbia, Canada
            </p>
          </div>
          <div className="flex gap-3 items-center">
            <Input
              placeholder="Search datasets..."
              className="w-64 bg-slate-700 border-slate-600 text-white placeholder:text-gray-400"
            />
            <Select defaultValue="all">
              <SelectTrigger className="w-40 bg-slate-700 border-slate-600 text-white">
                <SelectValue placeholder="Time Period" />
              </SelectTrigger>
              <SelectContent className="bg-slate-700 border-slate-600">
                <SelectItem value="all">All Time</SelectItem>
                <SelectItem value="today">Today</SelectItem>
                <SelectItem value="week">Last Week</SelectItem>
                <SelectItem value="month">Last Month</SelectItem>
                <SelectItem value="year">Last Year</SelectItem>
              </SelectContent>
            </Select>
            <Select defaultValue="all-types">
              <SelectTrigger className="w-40 bg-slate-700 border-slate-600 text-white">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent className="bg-slate-700 border-slate-600">
                <SelectItem value="all-types">All Types</SelectItem>
                <SelectItem value="elevation">Elevation Data</SelectItem>
                <SelectItem value="event">Event History</SelectItem>
                <SelectItem value="demographics">Demographics</SelectItem>
                <SelectItem value="infrastructure">Infrastructure</SelectItem>
              </SelectContent>
            </Select>
            <Select defaultValue="all-files">
              <SelectTrigger className="w-40 bg-slate-700 border-slate-600 text-white">
                <SelectValue placeholder="File Type" />
              </SelectTrigger>
              <SelectContent className="bg-slate-700 border-slate-600">
                <SelectItem value="all-files">All Files</SelectItem>
                <SelectItem value="geotiff">GeoTIFF</SelectItem>
                <SelectItem value="csv">CSV</SelectItem>
                <SelectItem value="json">JSON</SelectItem>
                <SelectItem value="shapefile">Shapefile</SelectItem>
                <SelectItem value="kml">KML</SelectItem>
              </SelectContent>
            </Select>
            <Button className="bg-blue-600 hover:bg-blue-700">
              Calculate Risk
            </Button>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="bg-slate-800 border-slate-700 p-4">
            <div className="flex items-center gap-3">
              <Database className="h-8 w-8 text-blue-400" />
              <div>
                <p className="text-2xl font-bold text-white">
                  24
                </p>
                <p className="text-sm text-gray-400">
                  Total Datasets
                </p>
              </div>
            </div>
          </Card>

          <Card className="bg-slate-800 border-slate-700 p-4">
            <div className="flex items-center gap-3">
              <CheckCircle className="h-8 w-8 text-green-400" />
              <div>
                <p className="text-2xl font-bold text-white">
                  18
                </p>
                <p className="text-sm text-gray-400">
                  Active Sources
                </p>
              </div>
            </div>
          </Card>

          <Card className="bg-slate-800 border-slate-700 p-4">
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-8 w-8 text-yellow-400" />
              <div>
                <p className="text-2xl font-bold text-white">
                  3
                </p>
                <p className="text-sm text-gray-400">
                  Quality Issues
                </p>
              </div>
            </div>
          </Card>

          <Card className="bg-slate-800 border-slate-700 p-4">
            <div className="flex items-center gap-3">
              <Calendar className="h-8 w-8 text-purple-400" />
              <div>
                <p className="text-2xl font-bold text-white">
                  2h
                </p>
                <p className="text-sm text-gray-400">
                  Last Upload
                </p>
              </div>
            </div>
          </Card>
        </div>

        {/* Data Upload Section - Three Columns */}
        <div className="bg-slate-800 rounded-lg p-6">
          <h2 className="text-xl font-semibold text-white mb-6 text-center">
            Upload New Dataset
          </h2>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
            {/* Column 1: Scientific Data */}
            <Card className="bg-white p-6">
              <div className="bg-blue-800 text-white text-center py-3 mb-4 rounded-t-lg -mx-6 -mt-6">
                <h3 className="font-semibold">
                  1. Scientific Data
                </h3>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Hazard Type
                  </label>
                  <Input
                    className="w-full"
                    placeholder="Enter hazard type"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Upload Topo GeoTIFF
                  </label>
                  <div className="flex gap-2">
                    <Input
                      className="flex-1"
                      placeholder="Choose file..."
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      className="px-3"
                    >
                      📁
                    </Button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Upload Topo Gerta (CSV)
                  </label>
                  <div className="flex gap-2">
                    <Input
                      className="flex-1"
                      placeholder="Choose file..."
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      className="px-3"
                    >
                      📁
                    </Button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Rainfall Data
                  </label>
                  <div className="flex gap-2">
                    <Input
                      className="flex-1"
                      placeholder="Enter data..."
                    />
                    <Button className="bg-blue-800 hover:bg-blue-900 text-white px-4 py-2 text-xs">
                      Enter
                    </Button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Seismic Data
                  </label>
                  <div className="flex gap-2">
                    <Input
                      className="flex-1"
                      placeholder="Choose file..."
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      className="px-3"
                    >
                      📁
                    </Button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Seismic Activity Log
                  </label>
                  <div className="flex gap-2">
                    <Input
                      className="flex-1"
                      placeholder="Choose file..."
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      className="px-3"
                    >
                      📁
                    </Button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Regional Data
                  </label>
                  <div className="flex gap-2">
                    <Input
                      className="flex-1"
                      placeholder="Enter data..."
                    />
                    <Button className="bg-blue-800 hover:bg-blue-900 text-white px-4 py-2 text-xs">
                      Enter
                    </Button>
                  </div>
                </div>
              </div>
            </Card>

            {/* Column 2: Local Lore & History */}
            <Card className="bg-white p-6">
              <div className="bg-blue-800 text-white text-center py-3 mb-4 rounded-t-lg -mx-6 -mt-6">
                <h3 className="font-semibold">
                  2. Local Lore & History
                </h3>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Cartorivianas
                  </label>
                  <div className="flex gap-2">
                    <Input
                      className="flex-1"
                      placeholder="Enter data..."
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      className="px-3"
                    >
                      ⚙️
                    </Button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Oral Histories
                  </label>
                  <Input
                    className="w-full"
                    placeholder="Enter oral histories..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Oral Histories (Text)
                  </label>
                  <Input
                    className="w-full"
                    placeholder="Enter text..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Historical Text (georeferenced)
                  </label>
                  <Input
                    className="w-full"
                    placeholder="Enter historical text..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Community Stories
                  </label>
                  <Input
                    className="w-full"
                    placeholder="Enter community stories..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Community Stories (JSON)
                  </label>
                  <Input
                    className="w-full"
                    placeholder="Upload JSON file..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Upload Data
                  </label>
                  <div className="flex gap-2">
                    <Input
                      className="flex-1"
                      placeholder="Choose file..."
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      className="px-3"
                    >
                      📁
                    </Button>
                  </div>
                </div>
              </div>
            </Card>

            {/* Column 3: Vulnerability Data */}
            <Card className="bg-white p-6">
              <div className="bg-blue-800 text-white text-center py-3 mb-4 rounded-t-lg -mx-6 -mt-6">
                <h3 className="font-semibold">
                  3. Vulnerability Data
                </h3>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Oscard Type
                  </label>
                  <div className="flex gap-2">
                    <Input
                      className="flex-1"
                      placeholder="Enter type..."
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      className="px-3"
                    >
                      ⚙️
                    </Button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Sea-level change
                  </label>
                  <div className="flex gap-2">
                    <Input
                      className="flex-1"
                      placeholder="Enter data..."
                    />
                    <Button className="bg-blue-800 hover:bg-blue-900 text-white px-4 py-2 text-xs">
                      Enter
                    </Button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Other option
                  </label>
                  <Input
                    className="w-full"
                    placeholder="Enter option..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Groundwater
                  </label>
                  <Input
                    className="w-full"
                    placeholder="Enter text..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Population Density (Shapefile /JSON)
                  </label>
                  <Input
                    className="w-full"
                    placeholder="Upload shapefile or JSON..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Infrastructure prints (KML)
                  </label>
                  <Input
                    className="w-full"
                    placeholder="Upload KML file..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Upload Data
                  </label>
                  <div className="flex gap-2">
                    <Input
                      type="file"
                      className="flex-1"
                      placeholder="Choose file..."
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      className="px-3"
                    >
                      📁
                    </Button>
                  </div>
                </div>
              </div>
            </Card>
          </div>

          {/* Submit Button */}
          <div className="text-center">
            <Button 
              onClick={handleSubmitData}
              className="bg-blue-800 hover:bg-blue-900 text-white px-8 py-3"
            >
              Submit Data
            </Button>
          </div>
        </div>

        {/* Datasets Table */}
        <Card className="bg-slate-800 border-slate-700">
          <div className="p-6 border-b border-slate-700">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold text-white">
                Datasets
              </h2>
              <div className="flex gap-2">
                <Button className="bg-blue-600 hover:bg-blue-700">
                  <Download className="h-4 w-4 mr-2" />
                  Download all datasets
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="bg-slate-700 border-slate-600 text-white hover:bg-slate-600"
                >
                  Filter
                </Button>
              </div>
            </div>
          </div>

          <Table>
            <TableHeader>
              <TableRow className="border-slate-700 hover:bg-slate-700/50">
                <TableHead className="text-gray-300">
                  Dataset Name
                </TableHead>
                <TableHead className="text-gray-300">
                  Type
                </TableHead>
                <TableHead className="text-gray-300">
                  Size
                </TableHead>
                <TableHead className="text-gray-300">
                  Last Updated
                </TableHead>
                <TableHead className="text-gray-300">
                  Status
                </TableHead>
                <TableHead className="text-gray-300">
                  Quality
                </TableHead>
                <TableHead className="text-gray-300">
                  Actions
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {datasets.map((dataset) => (
                <TableRow
                  key={dataset.id}
                  className="border-slate-700 hover:bg-slate-700/50"
                >
                  <TableCell className="font-medium text-white">
                    {dataset.name}
                  </TableCell>
                  <TableCell className="text-gray-300">
                    {dataset.type}
                  </TableCell>
                  <TableCell className="text-gray-300">
                    {dataset.size}
                  </TableCell>
                  <TableCell className="text-gray-300">
                    {dataset.lastUpdated}
                  </TableCell>
                  <TableCell>
                    {getStatusBadge(dataset.status)}
                  </TableCell>
                  <TableCell>
                    {getQualityBadge(dataset.quality)}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-blue-400 hover:text-blue-300 hover:bg-slate-700"
                      >
                        View
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-gray-400 hover:text-gray-300 hover:bg-slate-700"
                      >
                        Edit
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>

        {/* Data Sources */}
        <Card className="bg-slate-800 border-slate-700 p-6">
          <h2 className="text-xl font-semibold text-white mb-4">
            Data Sources
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {dataSources.map((source, index) => (
              <div
                key={index}
                className="bg-slate-700 rounded-lg p-4 flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  {getConnectionIcon(source.status)}
                  <div>
                    <p className="font-medium text-white">
                      {source.name}
                    </p>
                    <p className="text-sm text-gray-400">
                      Last Upload: {source.lastUpload}
                    </p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-blue-400 hover:text-blue-300 hover:bg-slate-600"
                >
                  Configure
                </Button>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}