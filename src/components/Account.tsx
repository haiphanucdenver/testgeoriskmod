import { useState } from "react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Card } from "./ui/card";
import { Separator } from "./ui/separator";
import { Badge } from "./ui/badge";
import { User, Mail, Calendar, Shield, Settings, LogOut } from "lucide-react";

interface AccountProps {
  onLogout: () => void;
}

export function Account({ onLogout }: AccountProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [profileData, setProfileData] = useState({
    name: "Hai Phan",
    email: "john.smith@gaiariask.com",
    role: "Risk Analyst",
    department: "Environmental Assessment",
    joinDate: "March 15, 2023",
    lastLogin: "Today at 2:14 PM"
  });

  const handleSave = () => {
    setIsEditing(false);
    // In a real app, you would save to backend here
  };

  const handleLogout = () => {
    if (confirm("Are you sure you want to log out?")) {
      onLogout();
    }
  };

  return (
    <div className="flex-1 bg-slate-800 p-8 overflow-auto">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl text-white mb-2">Account Settings</h1>
            <p className="text-slate-400">Manage your profile and account preferences</p>
          </div>
          <Button
            onClick={handleLogout}
            variant="destructive"
            className="bg-red-600 hover:bg-red-700"
          >
            <LogOut className="w-4 h-4 mr-2" />
            Log Out
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Profile Card */}
          <div className="lg:col-span-2">
            <Card className="bg-slate-700 border-slate-600 p-6">
              <div className="flex items-center gap-4 mb-6">
                <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center">
                  <User className="w-8 h-8 text-white" />
                </div>
                <div>
                  <h2 className="text-xl text-white">{profileData.name}</h2>
                  <p className="text-slate-400">{profileData.role}</p>
                  <Badge variant="secondary" className="mt-1">
                    {profileData.department}
                  </Badge>
                </div>
              </div>

              <Separator className="bg-slate-600 mb-6" />

              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg text-white">Profile Information</h3>
                  <Button
                    onClick={() => isEditing ? handleSave() : setIsEditing(true)}
                    variant="outline"
                    className="border-slate-600 text-slate-300 hover:bg-slate-600"
                  >
                    <Settings className="w-4 h-4 mr-2" />
                    {isEditing ? "Save Changes" : "Edit Profile"}
                  </Button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-slate-400 mb-2">Full Name</label>
                    {isEditing ? (
                      <Input
                        value={profileData.name}
                        onChange={(e) => setProfileData({...profileData, name: e.target.value})}
                        className="bg-slate-600 border-slate-500 text-white"
                      />
                    ) : (
                      <p className="text-white p-3 bg-slate-600 rounded-md">{profileData.name}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm text-slate-400 mb-2">Email Address</label>
                    {isEditing ? (
                      <Input
                        value={profileData.email}
                        onChange={(e) => setProfileData({...profileData, email: e.target.value})}
                        className="bg-slate-600 border-slate-500 text-white"
                      />
                    ) : (
                      <p className="text-white p-3 bg-slate-600 rounded-md">{profileData.email}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm text-slate-400 mb-2">Role</label>
                    {isEditing ? (
                      <Input
                        value={profileData.role}
                        onChange={(e) => setProfileData({...profileData, role: e.target.value})}
                        className="bg-slate-600 border-slate-500 text-white"
                      />
                    ) : (
                      <p className="text-white p-3 bg-slate-600 rounded-md">{profileData.role}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm text-slate-400 mb-2">Department</label>
                    {isEditing ? (
                      <Input
                        value={profileData.department}
                        onChange={(e) => setProfileData({...profileData, department: e.target.value})}
                        className="bg-slate-600 border-slate-500 text-white"
                      />
                    ) : (
                      <p className="text-white p-3 bg-slate-600 rounded-md">{profileData.department}</p>
                    )}
                  </div>
                </div>
              </div>
            </Card>
          </div>

          {/* Account Info Sidebar */}
          <div className="space-y-6">
            <Card className="bg-slate-700 border-slate-600 p-6">
              <h3 className="text-lg text-white mb-4 flex items-center gap-2">
                <Shield className="w-5 h-5" />
                Account Information
              </h3>
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <Calendar className="w-4 h-4 text-slate-400" />
                  <div>
                    <p className="text-sm text-slate-400">Member Since</p>
                    <p className="text-white">{profileData.joinDate}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Mail className="w-4 h-4 text-slate-400" />
                  <div>
                    <p className="text-sm text-slate-400">Last Login</p>
                    <p className="text-white">{profileData.lastLogin}</p>
                  </div>
                </div>
              </div>
            </Card>

            <Card className="bg-slate-700 border-slate-600 p-6">
              <h3 className="text-lg text-white mb-4">Quick Actions</h3>
              <div className="space-y-3">
                <Button
                  variant="outline"
                  className="w-full justify-start border-slate-600 text-slate-300 hover:bg-slate-600"
                >
                  Change Password
                </Button>
                <Button
                  variant="outline"
                  className="w-full justify-start border-slate-600 text-slate-300 hover:bg-slate-600"
                >
                  Download Data
                </Button>
                <Button
                  variant="outline"
                  className="w-full justify-start border-slate-600 text-slate-300 hover:bg-slate-600"
                >
                  Security Settings
                </Button>
              </div>
            </Card>

            <Card className="bg-slate-700 border-slate-600 p-6">
              <h3 className="text-lg text-white mb-4">System Access</h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-slate-300">Map Access</span>
                  <Badge variant="default" className="bg-green-600">Active</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-300">Data Management</span>
                  <Badge variant="default" className="bg-green-600">Active</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-300">Risk Assessment</span>
                  <Badge variant="default" className="bg-green-600">Active</Badge>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}