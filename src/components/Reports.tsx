import { useState } from "react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Card } from "./ui/card";
import { Badge } from "./ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { 
  FileText, 
  Download, 
  Calendar, 
  BarChart3, 
  TrendingUp, 
  AlertTriangle,
  CheckCircle,
  Clock,
  Filter,
  Search,
  Eye,
  Share,
  Plus
} from "lucide-react";

export function Reports() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedPeriod, setSelectedPeriod] = useState("last30");
  const [selectedType, setSelectedType] = useState("all");

  const reports = [
    {
      id: 1,
      title: "Monthly Risk Assessment Summary",
      type: "Risk Analysis",
      date: "Dec 15, 2024",
      status: "completed",
      size: "2.4 MB",
      format: "PDF",
      description: "Comprehensive analysis of environmental risks for December 2024"
    },
    {
      id: 2,
      title: "Flood Risk Evaluation - Northern Region",
      type: "Flood Analysis",
      date: "Dec 12, 2024",
      status: "completed",
      size: "1.8 MB",
      format: "PDF",
      description: "Detailed flood risk assessment covering northern territories"
    },
    {
      id: 3,
      title: "Seismic Activity Report Q4 2024",
      type: "Seismic Analysis",
      date: "Dec 10, 2024",
      status: "completed",
      size: "3.1 MB",
      format: "PDF",
      description: "Quarterly analysis of seismic activity and earthquake risks"
    },
    {
      id: 4,
      title: "Weather Pattern Analysis",
      type: "Weather Analysis",
      date: "Dec 8, 2024",
      status: "processing",
      size: "pending",
      format: "PDF",
      description: "Climate trends and extreme weather event predictions"
    },
    {
      id: 5,
      title: "Infrastructure Vulnerability Assessment",
      type: "Infrastructure",
      date: "Dec 5, 2024",
      status: "completed",
      size: "4.2 MB",
      format: "PDF",
      description: "Critical infrastructure risk evaluation and recommendations"
    }
  ];

  const statistics = [
    { label: "Total Reports", value: "127", trend: "+12%", color: "blue" },
    { label: "High Risk Areas", value: "8", trend: "-2", color: "red" },
    { label: "Active Assessments", value: "24", trend: "+5", color: "orange" },
    { label: "Completed This Month", value: "15", trend: "+8", color: "green" }
  ];

  const filteredReports = reports.filter(report =>
    report.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    report.type.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleGenerateReport = () => {
    console.log("Generate new report");
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "completed":
        return <Badge className="bg-green-600 text-white">Completed</Badge>;
      case "processing":
        return <Badge className="bg-orange-600 text-white">Processing</Badge>;
      case "failed":
        return <Badge variant="destructive">Failed</Badge>;
      default:
        return <Badge variant="secondary">Unknown</Badge>;
    }
  };

  return (
    <div className="flex-1 bg-slate-800 overflow-auto">
      {/* Header */}
      <div className="px-8 py-6 border-b border-slate-700">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl text-white mb-2">Reports</h1>
            <p className="text-slate-400">Generate and manage risk assessment reports</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Search reports..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 w-72 bg-slate-700 border-slate-600 text-white placeholder:text-slate-400"
              />
            </div>
            <Button
              onClick={handleGenerateReport}
              className="bg-blue-600 hover:bg-blue-700"
            >
              <Plus className="w-4 h-4 mr-2" />
              Generate Report
            </Button>
          </div>
        </div>
      </div>

      <div className="p-8">
        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {statistics.map((stat, index) => (
            <Card key={index} className="bg-slate-700 border-slate-600 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-400">{stat.label}</p>
                  <p className="text-2xl text-white mt-1">{stat.value}</p>
                </div>
                <div className={`text-${stat.color}-400 flex items-center gap-1`}>
                  <TrendingUp className="w-4 h-4" />
                  <span className="text-sm">{stat.trend}</span>
                </div>
              </div>
            </Card>
          ))}
        </div>

        <Tabs defaultValue="reports" className="space-y-6">
          <TabsList className="bg-slate-700 border-slate-600">
            <TabsTrigger value="reports" className="data-[state=active]:bg-slate-600">
              Report Library
            </TabsTrigger>
            <TabsTrigger value="analytics" className="data-[state=active]:bg-slate-600">
              Analytics Dashboard
            </TabsTrigger>
            <TabsTrigger value="scheduled" className="data-[state=active]:bg-slate-600">
              Scheduled Reports
            </TabsTrigger>
          </TabsList>

          <TabsContent value="reports">
            {/* Filters */}
            <Card className="bg-slate-700 border-slate-600 p-6 mb-6">
              <div className="flex items-center gap-4">
                <Filter className="w-5 h-5 text-slate-400" />
                <span className="text-white">Filters:</span>
                
                <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
                  <SelectTrigger className="w-48 bg-slate-600 border-slate-500 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-600 border-slate-500">
                    <SelectItem value="last7">Last 7 Days</SelectItem>
                    <SelectItem value="last30">Last 30 Days</SelectItem>
                    <SelectItem value="last90">Last 90 Days</SelectItem>
                    <SelectItem value="lastyear">Last Year</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={selectedType} onValueChange={setSelectedType}>
                  <SelectTrigger className="w-48 bg-slate-600 border-slate-500 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-600 border-slate-500">
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="risk">Risk Analysis</SelectItem>
                    <SelectItem value="flood">Flood Analysis</SelectItem>
                    <SelectItem value="seismic">Seismic Analysis</SelectItem>
                    <SelectItem value="weather">Weather Analysis</SelectItem>
                    <SelectItem value="infrastructure">Infrastructure</SelectItem>
                  </SelectContent>
                </Select>

                <Button variant="outline" className="border-slate-600 text-slate-300 hover:bg-slate-600">
                  Clear Filters
                </Button>
              </div>
            </Card>

            {/* Reports List */}
            <div className="space-y-4">
              {filteredReports.map((report) => (
                <Card key={report.id} className="bg-slate-700 border-slate-600 p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <FileText className="w-5 h-5 text-blue-400" />
                        <h3 className="text-lg text-white">{report.title}</h3>
                        {getStatusBadge(report.status)}
                      </div>
                      <p className="text-slate-400 mb-3">{report.description}</p>
                      <div className="flex items-center gap-6 text-sm text-slate-400">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-4 h-4" />
                          {report.date}
                        </span>
                        <span>Type: {report.type}</span>
                        <span>Size: {report.size}</span>
                        <span>Format: {report.format}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="border-slate-600 text-slate-300 hover:bg-slate-600"
                      >
                        <Eye className="w-4 h-4 mr-1" />
                        View
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="border-slate-600 text-slate-300 hover:bg-slate-600"
                        disabled={report.status !== "completed"}
                      >
                        <Download className="w-4 h-4 mr-1" />
                        Download
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="border-slate-600 text-slate-300 hover:bg-slate-600"
                      >
                        <Share className="w-4 h-4 mr-1" />
                        Share
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="analytics">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="bg-slate-700 border-slate-600 p-6">
                <h3 className="text-lg text-white mb-4 flex items-center gap-2">
                  <BarChart3 className="w-5 h-5" />
                  Report Generation Trends
                </h3>
                <div className="h-64 bg-slate-600 rounded-lg flex items-center justify-center">
                  <p className="text-slate-400">Chart placeholder - Report generation over time</p>
                </div>
              </Card>

              <Card className="bg-slate-700 border-slate-600 p-6">
                <h3 className="text-lg text-white mb-4 flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5" />
                  Risk Level Distribution
                </h3>
                <div className="h-64 bg-slate-600 rounded-lg flex items-center justify-center">
                  <p className="text-slate-400">Chart placeholder - Risk levels by region</p>
                </div>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="scheduled">
            <Card className="bg-slate-700 border-slate-600 p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg text-white flex items-center gap-2">
                  <Clock className="w-5 h-5" />
                  Scheduled Reports
                </h3>
                <Button className="bg-blue-600 hover:bg-blue-700">
                  <Plus className="w-4 h-4 mr-2" />
                  Schedule New Report
                </Button>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-slate-600 rounded-lg">
                  <div>
                    <p className="text-white">Weekly Risk Summary</p>
                    <p className="text-sm text-slate-400">Every Monday at 9:00 AM</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className="bg-green-600">Active</Badge>
                    <Button variant="outline" size="sm" className="border-slate-500 text-slate-300">
                      Edit
                    </Button>
                  </div>
                </div>

                <div className="flex items-center justify-between p-4 bg-slate-600 rounded-lg">
                  <div>
                    <p className="text-white">Monthly Comprehensive Report</p>
                    <p className="text-sm text-slate-400">First Monday of each month at 10:00 AM</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className="bg-green-600">Active</Badge>
                    <Button variant="outline" size="sm" className="border-slate-500 text-slate-300">
                      Edit
                    </Button>
                  </div>
                </div>

                <div className="flex items-center justify-between p-4 bg-slate-600 rounded-lg">
                  <div>
                    <p className="text-white">Emergency Alert Summary</p>
                    <p className="text-sm text-slate-400">Daily at 6:00 AM (when alerts exist)</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">Paused</Badge>
                    <Button variant="outline" size="sm" className="border-slate-500 text-slate-300">
                      Edit
                    </Button>
                  </div>
                </div>
              </div>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}