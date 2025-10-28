import { useState } from "react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Card } from "./ui/card";
import { Separator } from "./ui/separator";
import { Switch } from "./ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Slider } from "./ui/slider";
import { Badge } from "./ui/badge";
import { 
  Settings as SettingsIcon, 
  Bell, 
  Shield, 
  Globe, 
  Palette, 
  Database, 
  Clock,
  AlertTriangle,
  Save,
  RefreshCw
} from "lucide-react";

export function Settings() {
  const [notifications, setNotifications] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [riskThreshold, setRiskThreshold] = useState([75]);
  const [mapTheme, setMapTheme] = useState("satellite");

  const handleSaveSettings = () => {
    // In a real app, save settings to backend
    console.log("Settings saved");
  };

  const handleResetSettings = () => {
    // Reset to defaults
    setNotifications(true);
    setAutoRefresh(false);
    setRiskThreshold([75]);
    setMapTheme("satellite");
  };

  return (
    <div className="flex-1 bg-slate-800 p-8 overflow-auto">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl text-white mb-2">Settings</h1>
            <p className="text-slate-400">Configure your BorroRisk application preferences</p>
          </div>
          <div className="flex gap-3">
            <Button
              onClick={handleResetSettings}
              variant="outline"
              className="border-slate-600 text-slate-300 hover:bg-slate-700"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Reset to Defaults
            </Button>
            <Button
              onClick={handleSaveSettings}
              className="bg-blue-600 hover:bg-blue-700"
            >
              <Save className="w-4 h-4 mr-2" />
              Save Settings
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* General Settings */}
          <Card className="bg-slate-700 border-slate-600 p-6">
            <div className="flex items-center gap-3 mb-6">
              <SettingsIcon className="w-5 h-5 text-blue-400" />
              <h2 className="text-xl text-white">General Settings</h2>
            </div>

            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white">Enable Notifications</p>
                  <p className="text-sm text-slate-400">Receive alerts about risk updates</p>
                </div>
                <Switch
                  checked={notifications}
                  onCheckedChange={setNotifications}
                />
              </div>

              <Separator className="bg-slate-600" />

              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white">Auto-refresh Data</p>
                  <p className="text-sm text-slate-400">Automatically update risk assessments</p>
                </div>
                <Switch
                  checked={autoRefresh}
                  onCheckedChange={setAutoRefresh}
                />
              </div>

              <Separator className="bg-slate-600" />

              <div>
                <label className="block text-white mb-3">Default Map Theme</label>
                <Select value={mapTheme} onValueChange={setMapTheme}>
                  <SelectTrigger className="bg-slate-600 border-slate-500 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-600 border-slate-500">
                    <SelectItem value="satellite">Satellite View</SelectItem>
                    <SelectItem value="terrain">Terrain View</SelectItem>
                    <SelectItem value="street">Street Map</SelectItem>
                    <SelectItem value="hybrid">Hybrid View</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </Card>

          {/* Risk Assessment Settings */}
          <Card className="bg-slate-700 border-slate-600 p-6">
            <div className="flex items-center gap-3 mb-6">
              <AlertTriangle className="w-5 h-5 text-orange-400" />
              <h2 className="text-xl text-white">Risk Assessment</h2>
            </div>

            <div className="space-y-6">
              <div>
                <label className="block text-white mb-3">
                  High Risk Threshold: {riskThreshold[0]}%
                </label>
                <Slider
                  value={riskThreshold}
                  onValueChange={setRiskThreshold}
                  max={100}
                  min={0}
                  step={5}
                  className="w-full"
                />
                <div className="flex justify-between text-sm text-slate-400 mt-1">
                  <span>0%</span>
                  <span>50%</span>
                  <span>100%</span>
                </div>
              </div>

              <Separator className="bg-slate-600" />

              <div>
                <label className="block text-white mb-3">Risk Calculation Model</label>
                <Select defaultValue="standard">
                  <SelectTrigger className="bg-slate-600 border-slate-500 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-600 border-slate-500">
                    <SelectItem value="standard">Standard Model</SelectItem>
                    <SelectItem value="advanced">Advanced Model</SelectItem>
                    <SelectItem value="custom">Custom Model</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="block text-white mb-3">Update Frequency</label>
                <Select defaultValue="hourly">
                  <SelectTrigger className="bg-slate-600 border-slate-500 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-600 border-slate-500">
                    <SelectItem value="realtime">Real-time</SelectItem>
                    <SelectItem value="hourly">Every Hour</SelectItem>
                    <SelectItem value="daily">Daily</SelectItem>
                    <SelectItem value="manual">Manual Only</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </Card>

          {/* Security & Privacy */}
          <Card className="bg-slate-700 border-slate-600 p-6">
            <div className="flex items-center gap-3 mb-6">
              <Shield className="w-5 h-5 text-green-400" />
              <h2 className="text-xl text-white">Security & Privacy</h2>
            </div>

            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white">Two-Factor Authentication</p>
                  <p className="text-sm text-slate-400">Extra security for your account</p>
                </div>
                <Badge variant="outline" className="border-green-400 text-green-400">
                  Enabled
                </Badge>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white">Session Timeout</p>
                  <p className="text-sm text-slate-400">Auto-logout after inactivity</p>
                </div>
                <Select defaultValue="60">
                  <SelectTrigger className="w-32 bg-slate-600 border-slate-500 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-600 border-slate-500">
                    <SelectItem value="15">15 min</SelectItem>
                    <SelectItem value="30">30 min</SelectItem>
                    <SelectItem value="60">1 hour</SelectItem>
                    <SelectItem value="240">4 hours</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </Card>

          {/* Data Sources */}
          <Card className="bg-slate-700 border-slate-600 p-6">
            <div className="flex items-center gap-3 mb-6">
              <Database className="w-5 h-5 text-purple-400" />
              <h2 className="text-xl text-white">Data Sources</h2>
            </div>

            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white">OpenAI API</p>
                  <p className="text-sm text-slate-400">Real-time OpenAI data</p>
                </div>
                <Badge variant="default" className="bg-green-600">
                  Connected
                </Badge>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white">Maps API</p>
                  <p className="text-sm text-slate-400">Real-time Maps data</p>
                </div>
                <Badge variant="default" className="bg-green-600">
                  Connected
                </Badge>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white">AWS Database</p>
                  <p className="text-sm text-slate-400">Cloud database storage</p>
                </div>
                <Badge variant="default" className="bg-green-600">
                  Connected
                </Badge>
              </div>

              <Button
                variant="outline"
                className="w-full border-slate-600 text-slate-300 hover:bg-slate-600"
              >
                Manage Data Sources
              </Button>
            </div>
          </Card>
        </div>

        {/* API Configuration */}
        <Card className="bg-slate-700 border-slate-600 p-6">
          <div className="flex items-center gap-3 mb-6">
            <Globe className="w-5 h-5 text-blue-400" />
            <h2 className="text-xl text-white">API Configuration</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm text-slate-400 mb-2">OpenAI API Key</label>
              <Input
                type="password"
                placeholder="••••••••••••••••"
                className="bg-slate-600 border-slate-500 text-white"
              />
            </div>

            <div>
              <label className="block text-sm text-slate-400 mb-2">Maps API Key</label>
              <Input
                type="password"
                placeholder="••••••••••••••••"
                className="bg-slate-600 border-slate-500 text-white"
              />
            </div>

            <div>
              <label className="block text-sm text-slate-400 mb-2">Data Refresh Rate (minutes)</label>
              <Input
                type="number"
                placeholder="15"
                className="bg-slate-600 border-slate-500 text-white"
              />
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}